package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
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

	writeJSON(w, http.StatusOK, map[string]any{"results": results})
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

	writeJSON(w, http.StatusOK, results)
}

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
