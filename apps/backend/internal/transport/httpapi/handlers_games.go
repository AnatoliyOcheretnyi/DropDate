package httpapi

import (
	"net/http"
	"strconv"
	"strings"
	"time"

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

	var result games.Questions
	var err error
	if seedValue, parseErr := strconv.ParseInt(strings.TrimSpace(r.URL.Query().Get("seed")), 10, 64); parseErr == nil && seedValue != 0 {
		result, err = s.games.GenerateSeeded(r.Context(), mode, games.NormalizeCount(count), seedValue)
	} else if daily := strings.TrimSpace(r.URL.Query().Get("daily")); daily == "1" || daily == "true" {
		seed := games.DailySeed(mode, time.Now().UTC())
		result, err = s.games.GenerateSeeded(r.Context(), mode, games.NormalizeCount(count), seed)
	} else {
		result, err = s.games.Generate(r.Context(), mode, games.NormalizeCount(count))
	}
	if err != nil {
		s.logger.Printf("games generation failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to generate questions")
		return
	}

	writeJSON(w, http.StatusOK, result)
}
