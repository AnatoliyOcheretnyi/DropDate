package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/auth"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/friends"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/notifications"
)

type friendUserResponse struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

type friendshipResponse struct {
	ID            string             `json:"id"`
	Status        string             `json:"status"`
	CreatedAt     time.Time          `json:"createdAt"`
	RespondedAt   *time.Time         `json:"respondedAt,omitempty"`
	User          friendUserResponse `json:"user"`
	SavedTitles   int                `json:"savedTitles"`
	MutualTitles  int                `json:"mutualTitles"`
	RecentPosters []string           `json:"recentPosters,omitempty"`
}

func mapFriendshipResponse(fs friends.Friendship, user friendUserResponse) friendshipResponse {
	return friendshipResponse{
		ID:          fs.ID,
		Status:      string(fs.Status),
		CreatedAt:   fs.CreatedAt,
		RespondedAt: fs.RespondedAt,
		User:        user,
	}
}

func mapSummaryResponse(sm friends.Summary) friendshipResponse {
	return friendshipResponse{
		ID:          sm.ID,
		Status:      string(sm.Status),
		CreatedAt:   sm.CreatedAt,
		RespondedAt: sm.RespondedAt,
		User: friendUserResponse{
			ID:       sm.FriendUserID,
			Username: sm.Username,
			Email:    sm.Email,
		},
		SavedTitles:   sm.SavedCount,
		MutualTitles:  sm.MutualCount,
		RecentPosters: sm.RecentPosters,
	}
}

func mapSummaries(items []friends.Summary) []friendshipResponse {
	out := make([]friendshipResponse, 0, len(items))
	for _, item := range items {
		out = append(out, mapSummaryResponse(item))
	}
	return out
}

type friendSearchResult struct {
	User   friendUserResponse `json:"user"`
	Status string             `json:"status"`
}

// friendSearchHandler powers the typeahead: username prefix + exact-email
// matches, each annotated with the caller's relationship to that user —
// GET /friends/search?query=
func (s *Server) friendSearchHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.auth == nil || s.friends == nil {
		writeError(w, http.StatusServiceUnavailable, "storage unavailable")
		return
	}

	query := strings.TrimSpace(r.URL.Query().Get("query"))
	if len(query) < 3 {
		writeError(w, http.StatusBadRequest, "query must be at least 3 characters")
		return
	}

	candidates, err := s.auth.SearchUsers(r.Context(), userID, query, 8)
	if err != nil {
		s.logger.Printf("friend search failed: %v", err)
		writeError(w, http.StatusInternalServerError, "search failed")
		return
	}

	results := make([]friendSearchResult, 0, len(candidates))
	for _, candidate := range candidates {
		status, err := s.friends.RelationshipStatus(r.Context(), userID, candidate.ID)
		if err != nil {
			s.logger.Printf("relationship status failed: %v", err)
			writeError(w, http.StatusInternalServerError, "search failed")
			return
		}
		results = append(results, friendSearchResult{
			User:   friendUserResponse{ID: candidate.ID, Username: candidate.Username, Email: candidate.Email},
			Status: status,
		})
	}

	writeJSON(w, http.StatusOK, map[string]any{"results": results})
}

type sendFriendRequestBody struct {
	Query string `json:"query"`
}

// friendRequestsHandler sends a new friend request — POST /friends/requests
func (s *Server) friendRequestsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.auth == nil || s.friends == nil {
		writeError(w, http.StatusServiceUnavailable, "storage unavailable")
		return
	}

	var payload sendFriendRequestBody
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	query := strings.TrimSpace(payload.Query)
	if query == "" {
		writeError(w, http.StatusBadRequest, "query is required")
		return
	}

	target, err := s.auth.FindByUsernameOrEmail(r.Context(), query)
	if err != nil {
		if errors.Is(err, auth.ErrUserNotFound) {
			writeError(w, http.StatusNotFound, "user not found")
			return
		}
		s.logger.Printf("friend lookup failed: %v", err)
		writeError(w, http.StatusInternalServerError, "search failed")
		return
	}

	fs, err := s.friends.SendRequest(r.Context(), userID, target.ID)
	if err != nil {
		switch {
		case errors.Is(err, friends.ErrSelfRequest):
			writeError(w, http.StatusBadRequest, "cannot add yourself")
		case errors.Is(err, friends.ErrAlreadyFriends):
			writeError(w, http.StatusConflict, "already friends")
		case errors.Is(err, friends.ErrRequestPending):
			writeError(w, http.StatusConflict, "request already pending")
		default:
			s.logger.Printf("send friend request failed: %v", err)
			writeError(w, http.StatusInternalServerError, "failed to send request")
		}
		return
	}
	s.createSocialNotification(r, target.ID, fs.ID, "friend_request", userID)

	writeJSON(w, http.StatusOK, mapFriendshipResponse(fs, friendUserResponse{
		ID: target.ID, Username: target.Username, Email: target.Email,
	}))
}

type respondFriendRequestBody struct {
	FriendshipID string `json:"friendshipId"`
	Accept       bool   `json:"accept"`
}

// friendRequestRespondHandler accepts/declines an incoming request —
// POST /friends/requests/respond
func (s *Server) friendRequestRespondHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.friends == nil {
		writeError(w, http.StatusServiceUnavailable, "storage unavailable")
		return
	}

	var payload respondFriendRequestBody
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if strings.TrimSpace(payload.FriendshipID) == "" {
		writeError(w, http.StatusBadRequest, "friendshipId is required")
		return
	}

	fs, err := s.friends.Respond(r.Context(), userID, payload.FriendshipID, payload.Accept)
	if err != nil {
		switch {
		case errors.Is(err, friends.ErrNotFound):
			writeError(w, http.StatusNotFound, "friend request not found")
		case errors.Is(err, friends.ErrForbidden):
			writeError(w, http.StatusForbidden, "not allowed")
		default:
			s.logger.Printf("respond friend request failed: %v", err)
			writeError(w, http.StatusInternalServerError, "failed to respond")
		}
		return
	}
	if payload.Accept {
		s.createSocialNotification(r, fs.RequesterID, fs.ID, "friend_accepted", userID)
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": string(fs.Status)})
}

func (s *Server) createSocialNotification(r *http.Request, recipientID, friendshipID, eventType, actorID string) {
	if s.notifications == nil || s.auth == nil {
		return
	}
	actor, err := s.auth.GetByID(r.Context(), actorID)
	if err != nil {
		s.logger.Printf("social notification actor lookup failed: %v", err)
		return
	}
	name := actor.Username
	if name == "" {
		name = actor.Email
	}
	_, err = s.notifications.CreateIfMissing(r.Context(), notifications.CreateInput{
		UserID: recipientID, TMDBID: 0, MediaType: "social", Title: name,
		EventType: eventType, EventKey: eventType + ":" + friendshipID,
	})
	if err != nil {
		s.logger.Printf("social notification create failed: %v", err)
	}
}

// friendsHandler lists friends/requests (GET) or removes a friendship
// (DELETE) — /friends
func (s *Server) friendsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.handleFriendsList(w, r)
	case http.MethodDelete:
		s.handleFriendsRemove(w, r)
	default:
		methodNotAllowed(w)
	}
}

func (s *Server) handleFriendsList(w http.ResponseWriter, r *http.Request) {
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.friends == nil {
		writeError(w, http.StatusServiceUnavailable, "storage unavailable")
		return
	}

	friendsList, incoming, outgoing, err := s.friends.List(r.Context(), userID)
	if err != nil {
		s.logger.Printf("list friends failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load friends")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"friends":  mapSummaries(friendsList),
		"incoming": mapSummaries(incoming),
		"outgoing": mapSummaries(outgoing),
	})
}

func (s *Server) handleFriendsRemove(w http.ResponseWriter, r *http.Request) {
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.friends == nil {
		writeError(w, http.StatusServiceUnavailable, "storage unavailable")
		return
	}

	friendshipID := strings.TrimSpace(r.URL.Query().Get("friendshipId"))
	if friendshipID == "" {
		writeError(w, http.StatusBadRequest, "friendshipId is required")
		return
	}

	if err := s.friends.Remove(r.Context(), userID, friendshipID); err != nil {
		switch {
		case errors.Is(err, friends.ErrNotFound):
			writeError(w, http.StatusNotFound, "friendship not found")
		case errors.Is(err, friends.ErrForbidden):
			writeError(w, http.StatusForbidden, "not allowed")
		default:
			s.logger.Printf("remove friendship failed: %v", err)
			writeError(w, http.StatusInternalServerError, "failed to remove")
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// friendSavedHandler returns a friend's saved titles — gated on an accepted
// friendship — GET /friends/saved?friendId=&listType=
func (s *Server) friendSavedHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.friends == nil || s.saved == nil {
		writeError(w, http.StatusServiceUnavailable, "storage unavailable")
		return
	}

	friendID := strings.TrimSpace(r.URL.Query().Get("friendId"))
	if friendID == "" {
		writeError(w, http.StatusBadRequest, "friendId is required")
		return
	}

	ok, err := s.friends.IsFriend(r.Context(), userID, friendID)
	if err != nil {
		s.logger.Printf("friendship check failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to verify friendship")
		return
	}
	if !ok {
		writeError(w, http.StatusForbidden, "not friends")
		return
	}

	listType := strings.TrimSpace(r.URL.Query().Get("listType"))
	if listType != "" {
		normalized, valid := normalizeListType(listType)
		if !valid {
			writeError(w, http.StatusBadRequest, "invalid listType")
			return
		}
		listType = normalized
	}

	items, err := s.saved.List(r.Context(), friendID, listType)
	if err != nil {
		s.logger.Printf("friend saved list failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch saved titles")
		return
	}

	payload := make([]savedItem, 0, len(items))
	for _, item := range items {
		payload = append(payload, mapSavedItem(item))
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": payload})
}

// friendAchievementsHandler returns a friend's achievement progress — gated
// on an accepted friendship — GET /friends/achievements?friendId=
func (s *Server) friendAchievementsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.friends == nil || s.achievements == nil {
		writeError(w, http.StatusServiceUnavailable, "storage unavailable")
		return
	}

	friendID := strings.TrimSpace(r.URL.Query().Get("friendId"))
	if friendID == "" {
		writeError(w, http.StatusBadRequest, "friendId is required")
		return
	}

	ok, err := s.friends.IsFriend(r.Context(), userID, friendID)
	if err != nil {
		s.logger.Printf("friendship check failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to verify friendship")
		return
	}
	if !ok {
		writeError(w, http.StatusForbidden, "not friends")
		return
	}

	progress, err := s.achievements.Snapshot(r.Context(), friendID)
	if err != nil {
		s.logger.Printf("friend achievements snapshot failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch achievements")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"lists": progress})
}
