package httpapi

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/games"
)

func (s *Server) gamesQuestionsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	if s.games == nil {
		writeError(w, http.StatusServiceUnavailable, "games unavailable")
		return
	}

	mode, ok := games.SupportedMode(r.URL.Query().Get("mode"))
	if !ok {
		writeError(w, http.StatusBadRequest, "unsupported mode")
		return
	}

	count := 0
	if countStr := strings.TrimSpace(r.URL.Query().Get("count")); countStr != "" {
		if parsed, err := strconv.Atoi(countStr); err == nil {
			count = parsed
		}
	}

	result, err := s.games.Generate(r.Context(), mode, games.NormalizeCount(count))
	if err != nil {
		s.logger.Printf("games generation failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to generate questions")
		return
	}

	writeJSON(w, http.StatusOK, result)
}
