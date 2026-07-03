package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/cinematch"
)

func (s *Server) matchQuestionsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	if s.match == nil {
		writeError(w, http.StatusServiceUnavailable, "match unavailable")
		return
	}
	writeJSON(w, http.StatusOK, s.match.Questions())
}

func (s *Server) matchPicksHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	if s.match == nil {
		writeError(w, http.StatusServiceUnavailable, "match unavailable")
		return
	}

	var req cinematch.PicksRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErrorWithDetails(w, http.StatusBadRequest, "invalid_json", "invalid JSON body", nil)
		return
	}

	// Auth is optional: when a valid token is present, exclude saved titles.
	if userID, err := s.requireUserID(r); err == nil {
		req.UserID = userID
	}

	result, err := s.match.Picks(r.Context(), req)
	if err != nil {
		if errors.Is(err, cinematch.ErrInvalidRequest) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		s.logger.Printf("match picks failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to generate picks")
		return
	}

	writeJSON(w, http.StatusOK, result)
}
