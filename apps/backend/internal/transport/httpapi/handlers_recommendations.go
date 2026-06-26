package httpapi

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/recommendations"
)

func (s *Server) recommendationsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.recommendations == nil {
		writeError(w, http.StatusServiceUnavailable, "recommendations unavailable")
		return
	}

	limit := 0
	if limitStr := strings.TrimSpace(r.URL.Query().Get("limit")); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil {
			limit = parsed
		}
	}

	result, err := s.recommendations.Generate(r.Context(), userID, recommendations.NormalizeLimit(limit))
	if err != nil {
		// Degrade gracefully: never block the home page on a recommendation failure.
		s.logger.Printf("recommendations generation failed: %v", err)
		writeJSON(w, http.StatusOK, recommendations.Result{Items: []recommendations.Item{}})
		return
	}

	writeJSON(w, http.StatusOK, result)
}
