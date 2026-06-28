package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/moodpicker"
)

func (s *Server) moodQuestionsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	if s.mood == nil {
		writeError(w, http.StatusServiceUnavailable, "mood picker unavailable")
		return
	}
	depth := strings.TrimSpace(r.URL.Query().Get("depth"))
	writeJSON(w, http.StatusOK, s.mood.Questions(depth))
}

func (s *Server) moodPicksHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	if s.mood == nil {
		writeError(w, http.StatusServiceUnavailable, "mood picker unavailable")
		return
	}

	var req moodpicker.PicksRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErrorWithDetails(w, http.StatusBadRequest, "invalid_json", "invalid JSON body", nil)
		return
	}

	// Auth is optional: when a valid token is present, exclude saved titles.
	if userID, err := s.requireUserID(r); err == nil {
		req.UserID = userID
	}

	result, err := s.mood.Picks(r.Context(), req)
	if err != nil {
		if errors.Is(err, moodpicker.ErrInvalidRequest) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		s.logger.Printf("mood picks failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to generate picks")
		return
	}

	writeJSON(w, http.StatusOK, result)
}
