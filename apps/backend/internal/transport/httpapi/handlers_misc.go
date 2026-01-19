package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
)

func (s *Server) healthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) readyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	if s.readiness == nil {
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
		return
	}

	ctx := r.Context()
	if s.readinessTimeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, s.readinessTimeout)
		defer cancel()
	}

	checks := s.readiness.Readiness(ctx)
	overall := http.StatusOK
	payload := map[string]any{
		"status": "ok",
		"checks": formatReadiness(checks),
	}

	for _, err := range checks {
		if err != nil {
			overall = http.StatusServiceUnavailable
			payload["status"] = "not_ready"
			break
		}
	}

	writeJSON(w, overall, payload)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func formatReadiness(checks map[string]error) map[string]string {
	if len(checks) == 0 {
		return map[string]string{}
	}
	response := make(map[string]string, len(checks))
	for key, err := range checks {
		if err == nil {
			response[key] = "ok"
			continue
		}
		response[key] = err.Error()
	}
	return response
}
