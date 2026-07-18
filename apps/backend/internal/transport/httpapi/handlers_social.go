package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/notifications"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/social"
)

func (s *Server) socialRecommendationsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.social == nil {
		writeError(w, http.StatusServiceUnavailable, "social unavailable")
		return
	}
	var in struct {
		RecipientID string `json:"recipientId"`
		TMDBID      int    `json:"tmdbId"`
		MediaType   string `json:"mediaType"`
		Title       string `json:"title"`
		PosterURL   string `json:"posterUrl"`
		Message     string `json:"message"`
	}
	if json.NewDecoder(r.Body).Decode(&in) != nil || in.RecipientID == "" || in.TMDBID <= 0 || strings.TrimSpace(in.Title) == "" {
		writeError(w, http.StatusBadRequest, "invalid recommendation")
		return
	}
	item, err := s.social.Recommend(r.Context(), userID, in.RecipientID, in.TMDBID, in.MediaType, in.Title, in.PosterURL, in.Message)
	if errors.Is(err, social.ErrForbidden) {
		writeError(w, http.StatusForbidden, "recipient is not a friend")
		return
	}
	if err != nil {
		s.logger.Printf("friend recommendation failed: %v", err)
		writeError(w, 500, "recommendation failed")
		return
	}
	if s.notifications != nil {
		_, _ = s.notifications.CreateIfMissing(r.Context(), notifications.CreateInput{UserID: in.RecipientID, TMDBID: in.TMDBID, MediaType: in.MediaType, Title: in.Title, EventType: "friend_recommendation", EventKey: "friend-recommendation:" + item.ID, PosterURL: in.PosterURL, EpisodeName: strings.TrimSpace(in.Message)})
	}
	writeJSON(w, http.StatusCreated, item)
}

func (s *Server) socialListsHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, 401, "unauthorized")
		return
	}
	if s.social == nil {
		writeError(w, 503, "social unavailable")
		return
	}
	switch r.Method {
	case http.MethodGet:
		items, err := s.social.Lists(r.Context(), userID)
		if err != nil {
			writeError(w, 500, "lists failed")
			return
		}
		writeJSON(w, 200, map[string]any{"items": items})
	case http.MethodPost:
		var in struct {
			Name       string `json:"name"`
			Visibility string `json:"visibility"`
		}
		if json.NewDecoder(r.Body).Decode(&in) != nil || strings.TrimSpace(in.Name) == "" {
			writeError(w, 400, "name is required")
			return
		}
		item, err := s.social.CreateList(r.Context(), userID, in.Name, in.Visibility)
		if err != nil {
			writeError(w, 500, "create list failed")
			return
		}
		writeJSON(w, 201, item)
	default:
		methodNotAllowed(w)
	}
}

func (s *Server) socialListItemsHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, 401, "unauthorized")
		return
	}
	listID := strings.TrimSpace(r.URL.Query().Get("listId"))
	if listID == "" {
		writeError(w, 400, "listId is required")
		return
	}
	switch r.Method {
	case http.MethodGet:
		items, err := s.social.Items(r.Context(), userID, listID)
		if errors.Is(err, social.ErrForbidden) {
			writeError(w, 403, "forbidden")
			return
		}
		if err != nil {
			writeError(w, 500, "items failed")
			return
		}
		writeJSON(w, 200, map[string]any{"items": items})
	case http.MethodPost:
		var in struct {
			TMDBID    int    `json:"tmdbId"`
			MediaType string `json:"mediaType"`
			Title     string `json:"title"`
			PosterURL string `json:"posterUrl"`
		}
		if json.NewDecoder(r.Body).Decode(&in) != nil || in.TMDBID <= 0 {
			writeError(w, 400, "invalid item")
			return
		}
		item, err := s.social.AddItem(r.Context(), userID, listID, in.TMDBID, in.MediaType, in.Title, in.PosterURL)
		if errors.Is(err, social.ErrForbidden) {
			writeError(w, 403, "forbidden")
			return
		}
		if err != nil {
			writeError(w, 500, "add item failed")
			return
		}
		writeJSON(w, 201, item)
	default:
		methodNotAllowed(w)
	}
}

func (s *Server) socialActivityHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, 401, "unauthorized")
		return
	}
	items, err := s.social.Activity(r.Context(), userID, 50)
	if err != nil {
		s.logger.Printf("activity failed: %v", err)
		writeError(w, 500, "activity failed")
		return
	}
	writeJSON(w, 200, map[string]any{"items": items, "count": len(items), "description": fmt.Sprintf("%d friend events", len(items))})
}

func (s *Server) socialListMembersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, 401, "unauthorized")
		return
	}
	var in struct {
		ListID string `json:"listId"`
		UserID string `json:"userId"`
		Role   string `json:"role"`
	}
	if json.NewDecoder(r.Body).Decode(&in) != nil || in.ListID == "" || in.UserID == "" {
		writeError(w, 400, "invalid member")
		return
	}
	err = s.social.AddMember(r.Context(), userID, in.ListID, in.UserID, in.Role)
	if errors.Is(err, social.ErrForbidden) {
		writeError(w, 403, "friend or owner access required")
		return
	}
	if err != nil {
		writeError(w, 500, "add member failed")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "added"})
}

func (s *Server) socialPublicListHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	if s.social == nil {
		writeError(w, http.StatusServiceUnavailable, "social unavailable")
		return
	}
	list, items, err := s.social.PublicList(r.Context(), strings.TrimSpace(r.URL.Query().Get("token")))
	if err != nil {
		writeError(w, http.StatusNotFound, "list not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"list": list, "items": items})
}
