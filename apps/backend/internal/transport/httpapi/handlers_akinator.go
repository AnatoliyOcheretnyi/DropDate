package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/akinator"
)

func (s *Server) akinatorStartHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	if s.akinator == nil {
		writeError(w, http.StatusServiceUnavailable, "akinator unavailable")
		return
	}
	result, err := s.akinator.Start()
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "akinator dataset is not ready")
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) akinatorNextHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	if s.akinator == nil {
		writeError(w, http.StatusServiceUnavailable, "akinator unavailable")
		return
	}
	var input struct {
		SessionToken string                      `json:"sessionToken"`
		Answers      []akinator.AnsweredQuestion `json:"answers"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if input.SessionToken == "" {
		writeError(w, http.StatusBadRequest, "sessionToken is required")
		return
	}
	result, err := s.akinator.Next(input.Answers)
	if errors.Is(err, akinator.ErrInvalidHistory) {
		writeError(w, http.StatusBadRequest, "invalid answer history")
		return
	}
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "akinator unavailable")
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) akinatorResultHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	if s.akinator == nil {
		writeError(w, http.StatusServiceUnavailable, "akinator unavailable")
		return
	}
	var input akinator.ResultInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if err := s.akinator.LogResult(r.Context(), input); err != nil {
		if errors.Is(err, akinator.ErrInvalidHistory) {
			writeError(w, http.StatusBadRequest, "invalid result")
			return
		}
		s.logger.Printf("akinator result log failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to log result")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *Server) akinatorJobHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	if status, ok := s.authorizeJob(r); !ok {
		writeError(w, status, http.StatusText(status))
		return
	}
	if s.akinatorBuilder == nil {
		writeError(w, http.StatusServiceUnavailable, "akinator builder unavailable")
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Minute)
	defer cancel()
	written, err := s.akinatorBuilder.Refresh(ctx, limit)
	if err != nil {
		s.logger.Printf("akinator refresh failed after %d rows: %v", written, err)
		writeError(w, http.StatusBadGateway, "akinator refresh failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"movies": written})
}
