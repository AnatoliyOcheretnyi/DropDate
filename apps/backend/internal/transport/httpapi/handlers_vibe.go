package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/capabilities"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/themes"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/vibe"
)

type vibeRequest struct {
	Phrase string `json:"phrase"`
	Page   int    `json:"page"`
}

// vibePlanRequest re-runs an edited plan. No phrase interpretation happens
// here: the chips on screen are the query, which is why removing one is
// instant and costs no AI call.
type vibePlanRequest struct {
	Plan vibe.Plan `json:"plan"`
	Page int       `json:"page"`
}

type vibeResponse struct {
	Plan     vibe.Plan            `json:"plan"`
	Labels   []vibe.PlanLabel     `json:"labels"`
	Results  []release.Suggestion `json:"results"`
	Page     int                  `json:"page"`
	HasMore  bool                 `json:"hasMore"`
	Reranked bool                 `json:"reranked"`
	// Broadened tells the client the strict reading of the phrase came back
	// nearly empty, so what it is looking at answers part of the phrase rather
	// than all of it.
	Broadened bool   `json:"broadened"`
	Source    string `json:"source"`
}

// vibeHandler answers "опиши, що хочеш подивитись": it interprets the phrase
// and returns the first page of matches together with what it understood.
func (s *Server) vibeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	if s.vibe == nil {
		writeError(w, http.StatusServiceUnavailable, "vibe search unavailable")
		return
	}

	var req vibeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	phrase := vibe.NormalizePhrase(req.Phrase)
	if len([]rune(phrase)) < 3 {
		writeError(w, http.StatusBadRequest, "phrase should be at least 3 characters")
		return
	}

	userID := ""
	if id, err := s.requireUserID(r); err == nil {
		userID = id
	}
	useAI := s.aiEnabled(r.Context(), userID, capabilities.AIVibe)

	plan := s.vibe.Interpret(r.Context(), phrase, useAI)
	s.writeVibeResults(w, r, plan, req.Page)
}

// vibePlanHandler re-runs a plan the user edited on screen.
func (s *Server) vibePlanHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	if s.vibe == nil {
		writeError(w, http.StatusServiceUnavailable, "vibe search unavailable")
		return
	}

	var req vibePlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	// The client can post anything; the plan is validated against the same
	// vocabulary the model is held to.
	plan := s.vibe.Normalize(req.Plan)
	s.writeVibeResults(w, r, plan, req.Page)
}

func (s *Server) writeVibeResults(
	w http.ResponseWriter,
	r *http.Request,
	plan vibe.Plan,
	page int,
) {
	if plan.IsEmpty() {
		// Not an error: the phrase was read, nothing recognisable came out of
		// it, and the client shows the "не зрозуміли" state.
		writeJSON(w, http.StatusOK, vibeResponse{
			Plan:    plan,
			Labels:  []vibe.PlanLabel{},
			Results: []release.Suggestion{},
			Page:    1,
			Source:  plan.Source,
		})
		return
	}

	results, err := s.vibe.Results(r.Context(), plan, page)
	if err != nil {
		s.logger.Printf("vibe results failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch results")
		return
	}

	writeJSON(w, http.StatusOK, vibeResponse{
		Plan:      plan,
		Labels:    plan.Labels(),
		Results:   results.Items,
		Page:      results.Page,
		HasMore:   results.HasMore,
		Reranked:  results.Reranked,
		Broadened: results.Broadened,
		Source:    plan.Source,
	})
}

type vibeVocabularyResponse struct {
	Themes    []themes.Group `json:"themes"`
	Genres    []vibe.Genre   `json:"genres"`
	Countries []vibe.Country `json:"countries"`
}

// vibeVocabularyHandler feeds the "+ Додати" dropdown: the same vocabulary the
// model picks from, so the user edits the plan in exactly the terms the engine
// understands.
func (s *Server) vibeVocabularyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	writeJSON(w, http.StatusOK, vibeVocabularyResponse{
		Themes:    themes.FullCatalog().Groups,
		Genres:    vibe.Genres(),
		Countries: vibe.Countries(),
	})
}
