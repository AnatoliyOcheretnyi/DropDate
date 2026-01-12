package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/auth"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/saved"
)

type savedItem struct {
	TMDBID         int      `json:"tmdbId"`
	MediaType      string   `json:"mediaType"`
	Title          string   `json:"title"`
	NextRelease    string   `json:"nextRelease,omitempty"`
	Status         string   `json:"status"`
	PosterURL      string   `json:"posterUrl,omitempty"`
	BackdropURL    string   `json:"backdropUrl,omitempty"`
	ListTypes      []string `json:"listTypes,omitempty"`
	UserRating     *int     `json:"userRating,omitempty"`
	WatchCount     int      `json:"watchCount,omitempty"`
	LastWatchedAt  string   `json:"lastWatchedAt,omitempty"`
	RuntimeMinutes *int     `json:"runtimeMinutes,omitempty"`
	EpisodeCount   *int     `json:"episodeCount,omitempty"`
	Source         string   `json:"source"`
	Type           string   `json:"type"`
}

type saveRequest struct {
	TMDBID        int    `json:"tmdbId"`
	MediaType     string `json:"mediaType"`
	Title         string `json:"title"`
	NextRelease   string `json:"nextRelease"`
	Status        string `json:"status"`
	PosterURL     string `json:"posterUrl"`
	BackdropURL   string `json:"backdropUrl"`
	ListType      string `json:"listType"`
	UserRating    *int   `json:"userRating,omitempty"`
	WatchCount    *int   `json:"watchCount,omitempty"`
	LastWatchedAt string `json:"lastWatchedAt,omitempty"`
}

type updateStatsRequest struct {
	TMDBID        int    `json:"tmdbId"`
	MediaType     string `json:"mediaType"`
	ListType      string `json:"listType"`
	UserRating    *int   `json:"userRating,omitempty"`
	WatchCount    *int   `json:"watchCount,omitempty"`
	LastWatchedAt string `json:"lastWatchedAt,omitempty"`
}

func (s *Server) savedHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.handleSavedList(w, r)
	case http.MethodPost:
		s.handleSavedUpsert(w, r)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) savedItemHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodDelete:
		s.handleSavedDelete(w, r)
	case http.MethodPatch:
		s.handleSavedUpdate(w, r)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleSavedDelete(w http.ResponseWriter, r *http.Request) {
	userID, err := s.requireUserID(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	if s.saved == nil {
		http.Error(w, "storage unavailable", http.StatusServiceUnavailable)
		return
	}

	tmdbIDStr := strings.TrimSpace(r.URL.Query().Get("tmdbId"))
	mediaType := strings.TrimSpace(r.URL.Query().Get("mediaType"))
	listType := strings.TrimSpace(r.URL.Query().Get("listType"))
	if tmdbIDStr == "" || mediaType == "" {
		http.Error(w, "tmdbId and mediaType are required", http.StatusBadRequest)
		return
	}
	if listType != "" {
		if normalized, ok := normalizeListType(listType); ok {
			listType = normalized
		} else {
			http.Error(w, "invalid listType", http.StatusBadRequest)
			return
		}
	}
	tmdbID, err := strconv.Atoi(tmdbIDStr)
	if err != nil || tmdbID <= 0 {
		http.Error(w, "invalid tmdbId", http.StatusBadRequest)
		return
	}

	if err := s.saved.Remove(r.Context(), userID, tmdbID, mediaType, listType); err != nil {
		s.logger.Printf("saved delete failed: %v", err)
		http.Error(w, "failed to delete saved title", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleSavedUpdate(w http.ResponseWriter, r *http.Request) {
	userID, err := s.requireUserID(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	if s.saved == nil {
		http.Error(w, "storage unavailable", http.StatusServiceUnavailable)
		return
	}

	var payload updateStatsRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}
	if payload.TMDBID <= 0 || payload.MediaType == "" || payload.ListType == "" {
		http.Error(w, "tmdbId, mediaType and listType are required", http.StatusBadRequest)
		return
	}
	if normalized, ok := normalizeListType(payload.ListType); ok {
		payload.ListType = normalized
	} else {
		http.Error(w, "invalid listType", http.StatusBadRequest)
		return
	}
	var lastWatched *time.Time
	if strings.TrimSpace(payload.LastWatchedAt) != "" {
		if parsed, err := time.Parse(time.RFC3339, payload.LastWatchedAt); err == nil {
			lastWatched = &parsed
		}
	}

	if err := s.saved.UpdateStats(
		r.Context(),
		userID,
		payload.TMDBID,
		payload.MediaType,
		payload.ListType,
		payload.UserRating,
		payload.WatchCount,
		lastWatched,
	); err != nil {
		s.logger.Printf("saved stats update failed: %v", err)
		http.Error(w, "failed to update saved stats", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleSavedList(w http.ResponseWriter, r *http.Request) {
	userID, err := s.requireUserID(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	if s.saved == nil {
		http.Error(w, "storage unavailable", http.StatusServiceUnavailable)
		return
	}

	listType := strings.TrimSpace(r.URL.Query().Get("listType"))
	if listType != "" {
		if normalized, ok := normalizeListType(listType); ok {
			listType = normalized
		} else {
			http.Error(w, "invalid listType", http.StatusBadRequest)
			return
		}
	}
	items, err := s.saved.List(r.Context(), userID, listType)
	if err != nil {
		s.logger.Printf("saved list failed: %v", err)
		http.Error(w, "failed to fetch saved titles", http.StatusInternalServerError)
		return
	}

	payload := make([]savedItem, 0, len(items))
	for _, item := range items {
		payload = append(payload, mapSavedItem(item))
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]any{"items": payload}); err != nil {
		s.logger.Printf("failed to encode saved list: %v", err)
	}
}

func (s *Server) handleSavedUpsert(w http.ResponseWriter, r *http.Request) {
	userID, err := s.requireUserID(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	if s.saved == nil {
		http.Error(w, "storage unavailable", http.StatusServiceUnavailable)
		return
	}

	var payload saveRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}
	if payload.TMDBID <= 0 || payload.MediaType == "" || strings.TrimSpace(payload.Title) == "" {
		http.Error(w, "tmdbId, mediaType and title are required", http.StatusBadRequest)
		return
	}
	if payload.ListType != "" {
		if normalized, ok := normalizeListType(payload.ListType); ok {
			payload.ListType = normalized
		} else {
			http.Error(w, "invalid listType", http.StatusBadRequest)
			return
		}
	}

	var nextRelease *time.Time
	if strings.TrimSpace(payload.NextRelease) != "" {
		if parsed, err := time.Parse(time.RFC3339, payload.NextRelease); err == nil {
			nextRelease = &parsed
		}
	}
	var lastWatched *time.Time
	if strings.TrimSpace(payload.LastWatchedAt) != "" {
		if parsed, err := time.Parse(time.RFC3339, payload.LastWatchedAt); err == nil {
			lastWatched = &parsed
		}
	}
	var runtimeMinutes *int
	var episodeCount *int
	if s.releases != nil && payload.TMDBID > 0 && payload.MediaType != "" {
		if details, err := s.releases.Details(r.Context(), payload.TMDBID, payload.MediaType); err == nil {
			if details.Runtime > 0 {
				value := details.Runtime
				runtimeMinutes = &value
			}
			if details.EpisodeCount > 0 {
				value := details.EpisodeCount
				episodeCount = &value
			}
		}
	}

	item, err := s.saved.Upsert(r.Context(), saved.UpsertInput{
		UserID:         userID,
		TMDBID:         payload.TMDBID,
		MediaType:      payload.MediaType,
		Title:          strings.TrimSpace(payload.Title),
		NextRelease:    nextRelease,
		Status:         payload.Status,
		PosterURL:      strings.TrimSpace(payload.PosterURL),
		BackdropURL:    strings.TrimSpace(payload.BackdropURL),
		ListType:       strings.TrimSpace(payload.ListType),
		UserRating:     payload.UserRating,
		WatchCount:     payload.WatchCount,
		LastWatched:    lastWatched,
		RuntimeMinutes: runtimeMinutes,
		EpisodeCount:   episodeCount,
	})
	if err != nil {
		if errors.Is(err, saved.ErrInvalidMediaType) {
			http.Error(w, "invalid mediaType", http.StatusBadRequest)
			return
		}
		s.logger.Printf("saved upsert failed: %v", err)
		http.Error(w, "failed to save title", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(mapSavedItem(item)); err != nil {
		s.logger.Printf("failed to encode saved item: %v", err)
	}
}

func (s *Server) requireUserID(r *http.Request) (string, error) {
	if s.auth == nil {
		return "", auth.ErrInvalidToken
	}
	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	if authHeader == "" {
		return "", auth.ErrInvalidToken
	}
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
		return "", auth.ErrInvalidToken
	}
	return s.auth.ParseAccessToken(strings.TrimSpace(parts[1]))
}

func mapSavedItem(item saved.Title) savedItem {
	nextRelease := ""
	if item.NextRelease != nil {
		nextRelease = item.NextRelease.Format(time.RFC3339)
	}
	lastWatched := ""
	if item.LastWatched != nil {
		lastWatched = item.LastWatched.Format(time.RFC3339)
	}
	mediaType := item.MediaType
	releaseType := "series"
	if mediaType == "movie" {
		releaseType = "movie"
	}
	return savedItem{
		TMDBID:         item.TMDBID,
		MediaType:      mediaType,
		Title:          item.Title,
		NextRelease:    nextRelease,
		Status:         item.Status,
		PosterURL:      item.PosterURL,
		BackdropURL:    item.BackdropURL,
		ListTypes:      item.ListTypes,
		UserRating:     item.UserRating,
		WatchCount:     item.WatchCount,
		LastWatchedAt:  lastWatched,
		RuntimeMinutes: item.RuntimeMinutes,
		EpisodeCount:   item.EpisodeCount,
		Source:         "tmdb",
		Type:           releaseType,
	}
}

func normalizeListType(value string) (string, bool) {
	listType := strings.TrimSpace(strings.ToLower(value))
	switch listType {
	case "follow", "watchlist", "favorite", "watched", "disliked":
		return listType, true
	default:
		return "", false
	}
}
