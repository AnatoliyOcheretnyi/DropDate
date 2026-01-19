package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/notifications"
)

type notificationItem struct {
	ID            string `json:"id"`
	TMDBID        int    `json:"tmdbId"`
	MediaType     string `json:"mediaType"`
	Title         string `json:"title"`
	EventType     string `json:"eventType"`
	EventKey      string `json:"eventKey"`
	SeasonNumber  *int   `json:"seasonNumber,omitempty"`
	EpisodeNumber *int   `json:"episodeNumber,omitempty"`
	EpisodeName   string `json:"episodeName,omitempty"`
	ReleaseDate   string `json:"releaseDate,omitempty"`
	PosterURL     string `json:"posterUrl,omitempty"`
	BackdropURL   string `json:"backdropUrl,omitempty"`
	ReadAt        string `json:"readAt,omitempty"`
	CreatedAt     string `json:"createdAt"`
}

type notificationsResponse struct {
	Items       []notificationItem `json:"items"`
	UnreadCount int                `json:"unreadCount"`
}

type markReadRequest struct {
	IDs []string `json:"ids"`
	All bool     `json:"all"`
}

func (s *Server) notificationsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.notifications == nil {
		writeError(w, http.StatusServiceUnavailable, "storage unavailable")
		return
	}

	limit := 50
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	items, err := s.notifications.List(r.Context(), userID, limit)
	if err != nil {
		s.logger.Printf("notifications list failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch notifications")
		return
	}
	unreadCount, err := s.notifications.CountUnread(r.Context(), userID)
	if err != nil {
		s.logger.Printf("notifications unread count failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch unread count")
		return
	}

	payload := make([]notificationItem, 0, len(items))
	for _, item := range items {
		payload = append(payload, mapNotification(item))
	}

	writeJSON(w, http.StatusOK, notificationsResponse{
		Items:       payload,
		UnreadCount: unreadCount,
	})
}

func (s *Server) notificationsReadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.notifications == nil {
		writeError(w, http.StatusServiceUnavailable, "storage unavailable")
		return
	}

	var payload markReadRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if payload.All || len(payload.IDs) == 0 {
		if err := s.notifications.MarkAllRead(r.Context(), userID); err != nil {
			s.logger.Printf("notifications mark all failed: %v", err)
			writeError(w, http.StatusInternalServerError, "failed to mark read")
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if err := s.notifications.MarkRead(r.Context(), userID, payload.IDs); err != nil {
		s.logger.Printf("notifications mark read failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to mark read")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func mapNotification(item notifications.Notification) notificationItem {
	releaseDate := ""
	if item.ReleaseDate != nil {
		releaseDate = item.ReleaseDate.Format("2006-01-02")
	}
	readAt := ""
	if item.ReadAt != nil {
		readAt = item.ReadAt.Format(time.RFC3339)
	}
	return notificationItem{
		ID:            item.ID,
		TMDBID:        item.TMDBID,
		MediaType:     item.MediaType,
		Title:         item.Title,
		EventType:     item.EventType,
		EventKey:      item.EventKey,
		SeasonNumber:  item.SeasonNumber,
		EpisodeNumber: item.EpisodeNumber,
		EpisodeName:   strings.TrimSpace(item.EpisodeName),
		ReleaseDate:   releaseDate,
		PosterURL:     item.PosterURL,
		BackdropURL:   item.BackdropURL,
		ReadAt:        readAt,
		CreatedAt:     item.CreatedAt.Format(time.RFC3339),
	}
}
