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
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	title := strings.TrimSpace(r.URL.Query().Get("title"))
	if title == "" {
		http.Error(w, "title query parameter is required", http.StatusBadRequest)
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
			http.Error(w, "release not found", http.StatusNotFound)
			return
		}
		s.logger.Printf("release lookup failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(info); err != nil {
		s.logger.Printf("failed to encode response: %v", err)
	}
}

func (s *Server) suggestHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := strings.TrimSpace(r.URL.Query().Get("query"))
	if len(query) < 2 {
		http.Error(w, "query should be at least 2 characters", http.StatusBadRequest)
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
		http.Error(w, "failed to fetch suggestions", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]any{"results": results}); err != nil {
		s.logger.Printf("failed to encode suggestions: %v", err)
	}
}

func (s *Server) trendingHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
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
		http.Error(w, "failed to fetch trending movies", http.StatusInternalServerError)
		return
	}

	series, err := s.releases.TrendingByType(r.Context(), "tv", window, limit)
	if err != nil {
		s.logger.Printf("trending series failed: %v", err)
		http.Error(w, "failed to fetch trending series", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]any{
		"movies": movies,
		"series": series,
	}); err != nil {
		s.logger.Printf("failed to encode trending: %v", err)
	}
}

func (s *Server) searchHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := strings.TrimSpace(r.URL.Query().Get("query"))
	if query == "" {
		http.Error(w, "query is required", http.StatusBadRequest)
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
		http.Error(w, "failed to fetch search results", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(results); err != nil {
		s.logger.Printf("failed to encode search: %v", err)
	}
}

type detailsResponse struct {
	Details         release.Details      `json:"details"`
	Release         *release.Info        `json:"release,omitempty"`
	Recommendations []release.Suggestion `json:"recommendations,omitempty"`
}

func (s *Server) detailsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	tmdbIDStr := strings.TrimSpace(r.URL.Query().Get("tmdbId"))
	if tmdbIDStr == "" {
		http.Error(w, "tmdbId is required", http.StatusBadRequest)
		return
	}
	tmdbID, err := strconv.Atoi(tmdbIDStr)
	if err != nil || tmdbID <= 0 {
		http.Error(w, "invalid tmdbId", http.StatusBadRequest)
		return
	}

	mediaType := strings.TrimSpace(r.URL.Query().Get("mediaType"))
	if mediaType == "" {
		http.Error(w, "mediaType is required", http.StatusBadRequest)
		return
	}

	details, err := s.releases.Details(r.Context(), tmdbID, mediaType)
	if err != nil {
		if errors.Is(err, release.ErrNotFound) {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		s.logger.Printf("details failed: %v", err)
		http.Error(w, "failed to fetch details", http.StatusInternalServerError)
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

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(detailsResponse{
		Details:         details,
		Release:         releaseInfo,
		Recommendations: recommendations,
	}); err != nil {
		s.logger.Printf("failed to encode details: %v", err)
	}
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
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var payload bulkNextReleaseRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	results := make([]bulkNextReleaseResult, 0, len(payload.Items))
	if len(payload.Items) == 0 {
		http.Error(w, "items array is required", http.StatusBadRequest)
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

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]any{"results": results}); err != nil {
		s.logger.Printf("failed to encode bulk response: %v", err)
	}
}
