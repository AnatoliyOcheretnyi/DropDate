package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"
)

func (s *Server) tasteHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.taste == nil {
		writeError(w, http.StatusServiceUnavailable, "taste unavailable")
		return
	}
	kind := strings.TrimSpace(r.URL.Query().Get("kind"))
	switch r.Method {
	case http.MethodGet:
		items, err := s.taste.Rankings(r.Context(), userID, kind)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": items})
	case http.MethodPost:
		var input struct {
			Left   string `json:"left"`
			Right  string `json:"right"`
			Winner string `json:"winner"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		if err := s.taste.Compare(r.Context(), userID, kind, input.Left, input.Right, input.Winner); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		pair, err := s.taste.NextPair(r.Context(), userID, kind)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, pair)
	default:
		methodNotAllowed(w)
	}
}

func (s *Server) tasteNextHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.taste == nil {
		writeError(w, http.StatusServiceUnavailable, "taste unavailable")
		return
	}
	pair, err := s.taste.NextPair(r.Context(), userID, strings.TrimSpace(r.URL.Query().Get("kind")))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, pair)
}

func (s *Server) tasteOnboardingHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.taste == nil {
		writeError(w, http.StatusServiceUnavailable, "taste unavailable")
		return
	}
	switch r.Method {
	case http.MethodGet:
		completed, err := s.taste.OnboardingCompleted(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "status failed")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"completed": completed})
	case http.MethodPost:
		if err := s.taste.CompleteOnboarding(r.Context(), userID); err != nil {
			writeError(w, http.StatusInternalServerError, "completion failed")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"completed": true})
	default:
		methodNotAllowed(w)
	}
}
