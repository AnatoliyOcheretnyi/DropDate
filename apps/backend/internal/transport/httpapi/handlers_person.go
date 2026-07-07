package httpapi

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/airecs"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/capabilities"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
)

type personResponse struct {
	Person release.Person `json:"person"`
}

// personPickResponse is the AI-selected "you might enjoy" recommendation for a
// person's page. Empty when the model has nothing worthwhile to suggest.
type personPickResponse struct {
	Pick *personPick `json:"pick"`
}

type personPick struct {
	TMDBID    int    `json:"tmdbId"`
	MediaType string `json:"mediaType"`
	Title     string `json:"title"`
	Year      string `json:"year,omitempty"`
	PosterURL string `json:"posterUrl,omitempty"`
	Reason    string `json:"reason"`
}

func (s *Server) personHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	id, ok := parsePositiveID(r.URL.Query().Get("id"))
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	person, err := s.releases.Person(r.Context(), id)
	if err != nil {
		if errors.Is(err, release.ErrNotFound) {
			writeError(w, http.StatusNotFound, "not found")
			return
		}
		s.logger.Printf("person fetch failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch person")
		return
	}

	writeJSON(w, http.StatusOK, personResponse{Person: person})
}

// personRecommendHandler asks the model to pick one title from a person's
// filmography that the signed-in user has not watched yet. Optional ?role=
// narrows the pool to that role's credits.
func (s *Server) personRecommendHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	id, ok := parsePositiveID(r.URL.Query().Get("id"))
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.ai == nil || s.saved == nil ||
		!s.aiEnabled(r.Context(), userID, capabilities.AIRecommendations) {
		writeJSON(w, http.StatusOK, personPickResponse{})
		return
	}

	person, err := s.releases.Person(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusOK, personPickResponse{})
		return
	}

	role := strings.TrimSpace(strings.ToLower(r.URL.Query().Get("role")))
	pick, ok := s.personAIPick(r.Context(), userID, person, role)
	if !ok {
		writeJSON(w, http.StatusOK, personPickResponse{})
		return
	}
	writeJSON(w, http.StatusOK, personPickResponse{Pick: &pick})
}

func (s *Server) personAIPick(
	ctx context.Context,
	userID string,
	person release.Person,
	role string,
) (personPick, bool) {
	rows, err := s.saved.SeedRows(ctx, userID)
	if err != nil {
		return personPick{}, false
	}

	// Titles the user already engaged with are excluded from the pool: the point
	// is to surface something new from this person's body of work.
	watched := make(map[string]bool, len(rows))
	for _, row := range rows {
		watched[recKey(row.TMDBID, row.MediaType)] = true
	}

	pool := make([]airecs.Candidate, 0, len(person.Credits))
	byKey := make(map[string]release.PersonCredit, len(person.Credits))
	for _, credit := range person.Credits {
		if role != "" && credit.Role != role {
			continue
		}
		k := recKey(credit.TMDBID, credit.MediaType)
		if watched[k] || byKey[k].TMDBID != 0 {
			continue
		}
		byKey[k] = credit
		pool = append(pool, airecs.Candidate{
			TMDBID:    credit.TMDBID,
			MediaType: credit.MediaType,
			Title:     credit.Title,
			Year:      credit.Year,
		})
	}
	if len(pool) == 0 {
		return personPick{}, false
	}

	selections, err := s.ai.Rerank(ctx, tasteSignals(rows), pool, 1)
	if err != nil || len(selections) == 0 {
		return personPick{}, false
	}

	sel := selections[0]
	credit, ok := byKey[recKey(sel.TMDBID, sel.MediaType)]
	if !ok {
		return personPick{}, false
	}
	return personPick{
		TMDBID:    credit.TMDBID,
		MediaType: credit.MediaType,
		Title:     credit.Title,
		Year:      credit.Year,
		PosterURL: credit.PosterURL,
		Reason:    sel.Reason,
	}, true
}

func parsePositiveID(raw string) (int, bool) {
	id, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || id <= 0 {
		return 0, false
	}
	return id, true
}
