package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/auth"
)

type meResponse struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	Username    string `json:"username"`
	IsSuperuser bool   `json:"isSuperuser"`
}

type updateUsernameRequest struct {
	Username string `json:"username"`
}

func (s *Server) meHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.handleMeGet(w, r)
	case http.MethodPatch:
		s.handleMeUpdate(w, r)
	default:
		methodNotAllowed(w)
	}
}

func (s *Server) handleMeGet(w http.ResponseWriter, r *http.Request) {
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.auth == nil {
		writeError(w, http.StatusServiceUnavailable, "auth service unavailable")
		return
	}

	user, err := s.auth.GetByID(r.Context(), userID)
	if err != nil {
		s.logger.Printf("get me failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load profile")
		return
	}

	writeJSON(w, http.StatusOK, meResponse{
		ID:          user.ID,
		Email:       user.Email,
		Username:    user.Username,
		IsSuperuser: s.isSuperuserEmail(user.Email),
	})
}

func (s *Server) handleMeUpdate(w http.ResponseWriter, r *http.Request) {
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.auth == nil {
		writeError(w, http.StatusServiceUnavailable, "auth service unavailable")
		return
	}

	var payload updateUsernameRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	user, err := s.auth.UpdateUsername(r.Context(), userID, payload.Username)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrInvalidUsername):
			writeError(w, http.StatusBadRequest, "invalid username")
		case errors.Is(err, auth.ErrUsernameTaken):
			writeError(w, http.StatusConflict, "username already taken")
		default:
			s.logger.Printf("update username failed: %v", err)
			writeError(w, http.StatusInternalServerError, "failed to update username")
		}
		return
	}

	writeJSON(w, http.StatusOK, meResponse{
		ID:          user.ID,
		Email:       user.Email,
		Username:    user.Username,
		IsSuperuser: s.isSuperuserEmail(user.Email),
	})
}
