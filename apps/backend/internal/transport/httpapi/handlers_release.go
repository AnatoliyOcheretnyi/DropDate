package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
)

func (s *Server) nextReleaseHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	title := strings.TrimSpace(r.URL.Query().Get("title"))
	if title == "" {
		writeError(w, http.StatusBadRequest, "title query parameter is required")
		return
	}

	var hint *release.LookupHint
	if idStr := strings.TrimSpace(r.URL.Query().Get("tmdbId")); idStr != "" {
		if id, err := strconv.Atoi(idStr); err == nil && id > 0 {
			hint = &release.LookupHint{
				TMDBID:    id,
				MediaType: strings.TrimSpace(r.URL.Query().Get("mediaType")),
			}
		}
	}

	if hint != nil {
		s.logger.Printf("next-release query: title=%q tmdbId=%d mediaType=%s", title, hint.TMDBID, hint.MediaType)
	} else {
		s.logger.Printf("next-release query: title=%q (no hint)", title)
	}

	info, err := s.releases.NextRelease(r.Context(), title, hint)
	if err != nil {
		if errors.Is(err, release.ErrNotFound) {
			writeError(w, http.StatusNotFound, "release not found")
			return
		}
		s.logger.Printf("release lookup failed: %v", err)
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	writeJSON(w, http.StatusOK, info)
}

func (s *Server) suggestHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	query := strings.TrimSpace(r.URL.Query().Get("query"))
	if len(query) < 2 {
		writeError(w, http.StatusBadRequest, "query should be at least 2 characters")
		return
	}

	limit := 5
	if limitStr := strings.TrimSpace(r.URL.Query().Get("limit")); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	results, err := s.releases.Suggestions(r.Context(), query, limit)
	if err != nil {
		s.logger.Printf("suggestions failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch suggestions")
		return
	}

	// People ride along in the same dropdown: typing an actor's name should
	// lead somewhere even before the results page opens.
	people := s.matchedPeople(r.Context(), query, 3)

	payload := map[string]any{"results": results}
	if len(people) > 0 {
		payload["people"] = people
	}
	writeJSON(w, http.StatusOK, payload)
}

func (s *Server) trendingHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	window := strings.TrimSpace(r.URL.Query().Get("window"))
	limit := 18
	if limitStr := strings.TrimSpace(r.URL.Query().Get("limit")); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	movies, err := s.releases.TrendingByType(r.Context(), "movie", window, limit)
	if err != nil {
		s.logger.Printf("trending movies failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch trending movies")
		return
	}

	series, err := s.releases.TrendingByType(r.Context(), "tv", window, limit)
	if err != nil {
		s.logger.Printf("trending series failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch trending series")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"movies": movies,
		"series": series,
	})
}

func (s *Server) popularHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	limit := 18
	if limitStr := strings.TrimSpace(r.URL.Query().Get("limit")); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	movies, err := s.releases.Popular(r.Context(), "movie", limit)
	if err != nil {
		s.logger.Printf("popular movies failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch popular movies")
		return
	}

	series, err := s.releases.Popular(r.Context(), "tv", limit)
	if err != nil {
		s.logger.Printf("popular series failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch popular series")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"movies": movies,
		"series": series,
	})
}

func (s *Server) topRatedHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	limit := 18
	if limitStr := strings.TrimSpace(r.URL.Query().Get("limit")); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	movies, err := s.releases.TopRated(r.Context(), "movie", limit)
	if err != nil {
		s.logger.Printf("top-rated movies failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch top-rated movies")
		return
	}

	series, err := s.releases.TopRated(r.Context(), "tv", limit)
	if err != nil {
		s.logger.Printf("top-rated series failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch top-rated series")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"movies": movies,
		"series": series,
	})
}

func (s *Server) upcomingHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	limit := 18
	if limitStr := strings.TrimSpace(r.URL.Query().Get("limit")); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	movies, err := s.releases.Upcoming(r.Context(), "movie", limit)
	if err != nil {
		s.logger.Printf("upcoming movies failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch upcoming movies")
		return
	}

	series, err := s.releases.Upcoming(r.Context(), "tv", limit)
	if err != nil {
		s.logger.Printf("upcoming series failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch upcoming series")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"movies": movies,
		"series": series,
	})
}

func (s *Server) homeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	limit := 18
	if limitStr := strings.TrimSpace(r.URL.Query().Get("limit")); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	upcomingMovies, upcomingSeries, err := s.releases.HomeUpcoming(r.Context(), limit)
	if err != nil {
		s.logger.Printf("home upcoming feed failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch upcoming feed")
		return
	}

	popularMovies, err := s.releases.Popular(r.Context(), "movie", limit)
	if err != nil {
		s.logger.Printf("home popular movies failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch popular movies")
		return
	}

	popularSeries, err := s.releases.Popular(r.Context(), "tv", limit)
	if err != nil {
		s.logger.Printf("home popular series failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch popular series")
		return
	}

	topRatedMovies, err := s.releases.TopRated(r.Context(), "movie", limit)
	if err != nil {
		s.logger.Printf("home top-rated movies failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch top-rated movies")
		return
	}

	topRatedSeries, err := s.releases.TopRated(r.Context(), "tv", limit)
	if err != nil {
		s.logger.Printf("home top-rated series failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch top-rated series")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"upcoming": map[string]any{
			"movies": upcomingMovies,
			"series": upcomingSeries,
		},
		"popular": map[string]any{
			"movies": popularMovies,
			"series": popularSeries,
		},
		"topRated": map[string]any{
			"movies": topRatedMovies,
			"series": topRatedSeries,
		},
	})
}

func (s *Server) searchHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	query := strings.TrimSpace(r.URL.Query().Get("query"))
	if query == "" {
		writeError(w, http.StatusBadRequest, "query is required")
		return
	}

	page := 1
	if pageStr := strings.TrimSpace(r.URL.Query().Get("page")); pageStr != "" {
		if parsed, err := strconv.Atoi(pageStr); err == nil && parsed > 0 {
			page = parsed
		}
	}

	results, err := s.releases.Search(r.Context(), query, page)
	if err != nil {
		s.logger.Printf("search failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch search results")
		return
	}

	payload := searchResponse{SearchResults: results}
	// Only the first page carries the people block: paging through titles
	// should not repeat (or re-fetch) the same filmography.
	if page == 1 {
		payload.People = s.matchedPeople(r.Context(), query, 5)
		if len(payload.People) > 0 {
			top := payload.People[0]
			person, err := s.releases.Person(r.Context(), top.ID)
			if err != nil {
				s.logger.Printf("person filmography failed for %d: %v", top.ID, err)
			} else if titles := rankPersonCredits(person.Credits, personDepartment(top, person)); len(titles) > 0 {
				roles := personRoles(person.Credits, personDepartment(top, person))
				payload.People[0].Roles = roles
				payload.Person = &searchPerson{
					ID:         top.ID,
					Name:       personName(top, person),
					ProfileURL: top.ProfileURL,
					Department: personDepartment(top, person),
					Gender:     personGender(top, person),
					Roles:      roles,
				}
				payload.PersonTitles = titles
			}
		}
	}

	writeJSON(w, http.StatusOK, payload)
}

// searchResponse is the title search plus the people the query matched by name.
type searchResponse struct {
	release.SearchResults
	People       []release.PersonMatch `json:"people,omitempty"`
	Person       *searchPerson         `json:"person,omitempty"`
	PersonTitles []release.Suggestion  `json:"personTitles,omitempty"`
}

// searchPerson identifies whose filmography `personTitles` holds.
type searchPerson struct {
	ID         int      `json:"id"`
	Name       string   `json:"name"`
	ProfileURL string   `json:"profileUrl,omitempty"`
	Department string   `json:"department,omitempty"`
	Gender     int      `json:"gender,omitempty"`
	Roles      []string `json:"roles,omitempty"`
}

// matchedPeople returns the people a query matched, most prominent first.
//
// /search/multi only returns person hits when the query reads like a name — a
// title query such as "Дюна" comes back with no people at all — so no name
// matching is needed here. What it does need is re-ranking: TMDB orders by its
// own relevance, which floats obscure namesakes above the person the user
// means ("Нолан" returns Forrest Nolan before Крістофер Нолан). Popularity is
// the tiebreaker that fixes it.
func (s *Server) matchedPeople(ctx context.Context, query string, limit int) []release.PersonMatch {
	if s.releases == nil {
		return nil
	}
	// Rank over a deep enough slice: TMDB's own order can bury the obvious
	// person below namesakes, and a short dropdown list would cut them off.
	candidates := limit * 3
	if candidates < minPeopleCandidates {
		candidates = minPeopleCandidates
	}
	people, err := s.releases.SearchPeople(ctx, query, candidates)
	if err != nil {
		s.logger.Printf("people search failed: %v", err)
		return nil
	}

	matched := make([]release.PersonMatch, 0, len(people))
	for _, person := range people {
		// A person with neither a photo nor a known title is a stub: showing it
		// costs a row and leads to an empty page.
		if person.ProfileURL == "" && len(person.KnownFor) == 0 {
			continue
		}
		matched = append(matched, person)
	}

	sort.SliceStable(matched, func(i, j int) bool {
		return matched[i].Popularity > matched[j].Popularity
	})
	if len(matched) > limit {
		matched = matched[:limit]
	}
	return matched
}

// personName, personDepartment and personGender prefer the person record: it
// comes from a localized detail fetch, while the search hit may carry a name
// TMDB stores in Russian.
func personName(match release.PersonMatch, person release.Person) string {
	if strings.TrimSpace(person.Name) != "" {
		return person.Name
	}
	return match.Name
}

func personDepartment(match release.PersonMatch, person release.Person) string {
	if strings.TrimSpace(person.KnownForDepartment) != "" {
		return person.KnownForDepartment
	}
	return match.Department
}

func personGender(match release.PersonMatch, person release.Person) int {
	if person.Gender != 0 {
		return person.Gender
	}
	return match.Gender
}

// personRoles names what a person actually does, from their credits rather than
// from the single known-for department: someone who both acts and directs
// should read as both. Ordered by how much of their work each role covers.
func personRoles(credits []release.PersonCredit, department string) []string {
	counts := map[string]int{}
	for _, credit := range credits {
		if isTalkShowAppearance(credit) {
			continue
		}
		counts[credit.Role]++
	}
	total := 0
	for _, count := range counts {
		total += count
	}
	if total == 0 {
		if role := roleForDepartment(department); role != "" {
			return []string{role}
		}
		return nil
	}

	roles := make([]string, 0, len(counts))
	for role, count := range counts {
		// A handful of credits in a role is a career; one is a favour to a
		// friend. Either a real share of their work or a solid absolute count.
		if count >= minCreditsPerRole || float64(count)/float64(total) >= minSharePerRole {
			roles = append(roles, role)
		}
	}
	primary := roleForDepartment(department)
	sort.SliceStable(roles, func(i, j int) bool {
		if (roles[i] == primary) != (roles[j] == primary) {
			return roles[i] == primary
		}
		return counts[roles[i]] > counts[roles[j]]
	})
	if len(roles) > maxPersonRoles {
		roles = roles[:maxPersonRoles]
	}
	if len(roles) == 0 && primary != "" {
		roles = []string{primary}
	}
	return roles
}

const (
	minCreditsPerRole = 3
	minSharePerRole   = 0.15
	maxPersonRoles    = 2
)

// rankPersonCredits turns a combined filmography into the work a person is
// actually known for: talk-show appearances dropped, their own department
// first, most prominent first, deduplicated across roles so a film they both
// wrote and directed appears once.
func rankPersonCredits(all []release.PersonCredit, department string) []release.Suggestion {
	primaryRole := roleForDepartment(department)

	credits := make([]release.PersonCredit, 0, len(all))
	for _, credit := range all {
		if credit.TMDBID <= 0 || strings.TrimSpace(credit.Title) == "" {
			continue
		}
		if isTalkShowAppearance(credit) {
			continue
		}
		credits = append(credits, credit)
	}

	sort.SliceStable(credits, func(i, j int) bool {
		left, right := credits[i], credits[j]
		// What the person is known for comes first: a director's own films
		// before the ones they only acted in.
		leftPrimary := primaryRole != "" && left.Role == primaryRole
		rightPrimary := primaryRole != "" && right.Role == primaryRole
		if leftPrimary != rightPrimary {
			return leftPrimary
		}
		if left.Popularity != right.Popularity {
			return left.Popularity > right.Popularity
		}
		return left.VoteAverage > right.VoteAverage
	})

	titles := make([]release.Suggestion, 0, maxPersonSearchTitles)
	seen := make(map[string]bool, len(credits))
	for _, credit := range credits {
		key := fmt.Sprintf("%s:%d", credit.MediaType, credit.TMDBID)
		if seen[key] {
			continue
		}
		seen[key] = true
		titles = append(titles, release.Suggestion{
			ID:        credit.TMDBID,
			Title:     credit.Title,
			MediaType: credit.MediaType,
			Year:      credit.Year,
			PosterURL: credit.PosterURL,
		})
		if len(titles) == maxPersonSearchTitles {
			break
		}
	}
	return titles
}

// isTalkShowAppearance reports whether a credit is the person appearing as
// themselves rather than playing a part. Combined credits are full of these and
// they are the most popular TV entries by far — unfiltered, searching for a
// director returns late-night shows instead of films.
//
// Two signals: an explicit "Self" character, and — for the many talk shows that
// carry no character at all — a TV acting credit without a character, which a
// real series role practically always has.
func isTalkShowAppearance(credit release.PersonCredit) bool {
	character := strings.ToLower(strings.TrimSpace(credit.Character))
	if character == "" {
		return credit.MediaType == "tv" && credit.Role == "actor"
	}
	for _, marker := range []string{"self", "himself", "herself", "themselves", "себе", "гість"} {
		if strings.HasPrefix(character, marker) || strings.Contains(character, " "+marker) {
			return true
		}
	}
	return false
}

// roleForDepartment maps a TMDB department onto the credit role that department
// produces. Anything else (Production, Sound…) has no primary role.
func roleForDepartment(department string) string {
	switch strings.ToLower(strings.TrimSpace(department)) {
	case "directing":
		return "director"
	case "writing":
		return "writer"
	case "acting":
		return "actor"
	default:
		return ""
	}
}

// minPeopleCandidates is how many person hits are ranked before the list is
// trimmed to what the caller asked for.
const minPeopleCandidates = 15

// maxPersonSearchTitles keeps the filmography block to a couple of rows; the
// person page carries the full list.
const maxPersonSearchTitles = 24

type detailsResponse struct {
	Details         release.Details      `json:"details"`
	Release         *release.Info        `json:"release,omitempty"`
	Recommendations []release.Suggestion `json:"recommendations,omitempty"`
}

func (s *Server) detailsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	tmdbIDStr := strings.TrimSpace(r.URL.Query().Get("tmdbId"))
	if tmdbIDStr == "" {
		writeError(w, http.StatusBadRequest, "tmdbId is required")
		return
	}
	tmdbID, err := strconv.Atoi(tmdbIDStr)
	if err != nil || tmdbID <= 0 {
		writeError(w, http.StatusBadRequest, "invalid tmdbId")
		return
	}

	mediaType := strings.TrimSpace(r.URL.Query().Get("mediaType"))
	if mediaType == "" {
		writeError(w, http.StatusBadRequest, "mediaType is required")
		return
	}

	details, err := s.releases.Details(r.Context(), tmdbID, mediaType)
	if err != nil {
		if errors.Is(err, release.ErrNotFound) {
			writeError(w, http.StatusNotFound, "not found")
			return
		}
		s.logger.Printf("details failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch details")
		return
	}

	recommendations, err := s.releases.Recommendations(r.Context(), tmdbID, mediaType, 12)
	if err != nil {
		s.logger.Printf("recommendations failed: %v", err)
		recommendations = []release.Suggestion{}
	}

	var releaseInfo *release.Info
	if details.Title != "" {
		info, err := s.releases.NextRelease(
			r.Context(),
			details.Title,
			&release.LookupHint{TMDBID: tmdbID, MediaType: mediaType},
		)
		if err == nil {
			releaseInfo = &info
		}
	}

	writeJSON(w, http.StatusOK, detailsResponse{
		Details:         details,
		Release:         releaseInfo,
		Recommendations: recommendations,
	})
}

type bulkNextReleaseRequest struct {
	Items []bulkNextReleaseItem `json:"items"`
}

type bulkNextReleaseItem struct {
	ClientID  string `json:"clientId"`
	Title     string `json:"title"`
	TMDBID    int    `json:"tmdbId"`
	MediaType string `json:"mediaType"`
}

type bulkNextReleaseResult struct {
	ClientID string        `json:"clientId"`
	Info     *release.Info `json:"info,omitempty"`
	Error    string        `json:"error,omitempty"`
}

func (s *Server) bulkNextReleaseHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}

	var payload bulkNextReleaseRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	results := make([]bulkNextReleaseResult, 0, len(payload.Items))
	if len(payload.Items) == 0 {
		writeError(w, http.StatusBadRequest, "items array is required")
		return
	}

	for _, item := range payload.Items {
		entry := bulkNextReleaseResult{ClientID: item.ClientID}
		title := strings.TrimSpace(item.Title)
		if title == "" && item.TMDBID == 0 {
			entry.Error = "title or tmdbId is required"
			results = append(results, entry)
			continue
		}

		lookupTitle := title
		if lookupTitle == "" {
			lookupTitle = fmt.Sprintf("tmdb:%d", item.TMDBID)
		}

		var hint *release.LookupHint
		if item.TMDBID > 0 {
			hint = &release.LookupHint{
				TMDBID:    item.TMDBID,
				MediaType: item.MediaType,
			}
		}

		info, err := s.releases.NextRelease(r.Context(), lookupTitle, hint)
		if err != nil {
			if errors.Is(err, release.ErrNotFound) {
				entry.Error = "not found"
			} else {
				entry.Error = err.Error()
			}
		} else {
			copyInfo := info
			entry.Info = &copyInfo
		}

		results = append(results, entry)
	}

	writeJSON(w, http.StatusOK, map[string]any{"results": results})
}
