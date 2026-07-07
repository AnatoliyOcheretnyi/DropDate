package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/people"
)

type personFollowItem struct {
	PersonID   int    `json:"personId"`
	Role       string `json:"role"`
	Name       string `json:"name"`
	ProfileURL string `json:"profileUrl,omitempty"`
	KnownFor   string `json:"knownFor,omitempty"`
	Liked      bool   `json:"liked"`
	Subscribed bool   `json:"subscribed"`
}

type personFollowRequest struct {
	PersonID   int    `json:"personId"`
	Role       string `json:"role"`
	Name       string `json:"name"`
	ProfileURL string `json:"profileUrl"`
	KnownFor   string `json:"knownFor"`
	Liked      *bool  `json:"liked"`
	Subscribed *bool  `json:"subscribed"`
}

func (s *Server) peopleFollowsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.handlePeopleList(w, r)
	case http.MethodPost:
		s.handlePeopleUpsert(w, r)
	case http.MethodDelete:
		s.handlePeopleDelete(w, r)
	default:
		methodNotAllowed(w)
	}
}

func (s *Server) handlePeopleList(w http.ResponseWriter, r *http.Request) {
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.people == nil {
		writeError(w, http.StatusServiceUnavailable, "storage unavailable")
		return
	}

	follows, err := s.people.List(r.Context(), userID)
	if err != nil {
		s.logger.Printf("people list failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch followed people")
		return
	}

	payload := make([]personFollowItem, 0, len(follows))
	for _, item := range follows {
		payload = append(payload, mapPersonFollow(item))
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": payload})
}

func (s *Server) handlePeopleUpsert(w http.ResponseWriter, r *http.Request) {
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.people == nil {
		writeError(w, http.StatusServiceUnavailable, "storage unavailable")
		return
	}

	var payload personFollowRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if payload.PersonID <= 0 || strings.TrimSpace(payload.Name) == "" {
		writeError(w, http.StatusBadRequest, "personId and name are required")
		return
	}
	if people.NormalizeRole(payload.Role) == "" {
		writeError(w, http.StatusBadRequest, "invalid role")
		return
	}

	// A subscription implies a like: you cannot follow someone's releases without
	// liking them first.
	liked := true
	if payload.Liked != nil {
		liked = *payload.Liked
	}
	subscribed := false
	if payload.Subscribed != nil {
		subscribed = *payload.Subscribed
	}
	if subscribed {
		liked = true
	}

	item, err := s.people.Upsert(r.Context(), people.UpsertInput{
		UserID:     userID,
		PersonID:   payload.PersonID,
		Role:       payload.Role,
		Name:       payload.Name,
		ProfileURL: payload.ProfileURL,
		KnownFor:   payload.KnownFor,
		Liked:      liked,
		Subscribed: subscribed,
	})
	if err != nil {
		if errors.Is(err, people.ErrInvalidRole) {
			writeError(w, http.StatusBadRequest, "invalid role")
			return
		}
		s.logger.Printf("people upsert failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to follow person")
		return
	}

	writeJSON(w, http.StatusOK, mapPersonFollow(item))
}

func (s *Server) handlePeopleDelete(w http.ResponseWriter, r *http.Request) {
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.people == nil {
		writeError(w, http.StatusServiceUnavailable, "storage unavailable")
		return
	}

	personID, ok := parsePositiveID(r.URL.Query().Get("personId"))
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid personId")
		return
	}
	role := strings.TrimSpace(r.URL.Query().Get("role"))
	if role != "" && people.NormalizeRole(role) == "" {
		writeError(w, http.StatusBadRequest, "invalid role")
		return
	}

	if err := s.people.Remove(r.Context(), userID, personID, role); err != nil {
		s.logger.Printf("people delete failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to unfollow person")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func mapPersonFollow(item people.Follow) personFollowItem {
	return personFollowItem{
		PersonID:   item.PersonID,
		Role:       item.Role,
		Name:       item.Name,
		ProfileURL: item.ProfileURL,
		KnownFor:   item.KnownFor,
		Liked:      item.Liked,
		Subscribed: item.Subscribed,
	}
}
