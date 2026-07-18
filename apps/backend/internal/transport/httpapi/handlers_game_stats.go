package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/gamestats"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/notifications"
)

func (s *Server) gameResultsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	uid, e := s.requireUserID(r)
	if e != nil {
		writeError(w, 401, "unauthorized")
		return
	}
	var in struct {
		GameID string `json:"gameId"`
		Score  int    `json:"score"`
		Streak int    `json:"streak"`
		Daily  bool   `json:"daily"`
	}
	if json.NewDecoder(r.Body).Decode(&in) != nil || in.GameID == "" {
		writeError(w, 400, "invalid result")
		return
	}
	if e = s.gameStats.Record(r.Context(), uid, in.GameID, in.Score, in.Streak, in.Daily); e != nil {
		writeError(w, 500, "record failed")
		return
	}
	writeJSON(w, 201, map[string]string{"status": "recorded"})
}
func (s *Server) gameStatsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	uid, e := s.requireUserID(r)
	if e != nil {
		writeError(w, 401, "unauthorized")
		return
	}
	items, streak, e := s.gameStats.Stats(r.Context(), uid)
	if e != nil {
		writeError(w, 500, "stats failed")
		return
	}
	achievements := []string{}
	for _, item := range items {
		if item.Plays >= 10 {
			achievements = append(achievements, "regular:"+item.GameID)
		}
		if item.BestStreak >= 10 {
			achievements = append(achievements, "streak-master:"+item.GameID)
		}
		if item.BestScore >= 8 {
			achievements = append(achievements, "cinephile:"+item.GameID)
		}
	}
	if streak >= 7 {
		achievements = append(achievements, "daily-week")
	}
	writeJSON(w, 200, map[string]any{"items": items, "dailyStreak": streak, "achievements": achievements})
}
func (s *Server) gameLeaderboardHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	uid, e := s.requireUserID(r)
	if e != nil {
		writeError(w, 401, "unauthorized")
		return
	}
	items, e := s.gameStats.Leaderboard(r.Context(), uid)
	if e != nil {
		writeError(w, 500, "leaderboard failed")
		return
	}
	writeJSON(w, 200, map[string]any{"items": items})
}
func (s *Server) gameChallengesHandler(w http.ResponseWriter, r *http.Request) {
	uid, e := s.requireUserID(r)
	if e != nil {
		writeError(w, 401, "unauthorized")
		return
	}
	if r.Method == http.MethodGet {
		items, err := s.gameStats.Challenges(r.Context(), uid)
		if err != nil {
			writeError(w, 500, "challenges failed")
			return
		}
		writeJSON(w, 200, map[string]any{"items": items})
		return
	}
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	var in struct {
		OpponentID, GameID, ChallengeID string
		Score                           *int `json:"score"`
	}
	if json.NewDecoder(r.Body).Decode(&in) != nil {
		writeError(w, 400, "invalid challenge")
		return
	}
	if in.ChallengeID != "" && in.Score != nil {
		e = s.gameStats.Submit(r.Context(), uid, in.ChallengeID, *in.Score)
		if errors.Is(e, gamestats.ErrForbidden) {
			writeError(w, 403, "forbidden")
			return
		}
		writeJSON(w, 200, map[string]string{"status": "submitted"})
		return
	}
	item, e := s.gameStats.CreateChallenge(r.Context(), uid, in.OpponentID, in.GameID, time.Now().UnixNano())
	if errors.Is(e, gamestats.ErrForbidden) {
		writeError(w, 403, "opponent is not a friend")
		return
	}
	if e != nil {
		writeError(w, 500, "challenge failed")
		return
	}
	if s.notifications != nil {
		_, _ = s.notifications.CreateIfMissing(r.Context(), notifications.CreateInput{UserID: in.OpponentID, TMDBID: 0, MediaType: "social", Title: "Новий кіновиклик", EventType: "game_challenge", EventKey: "game-challenge:" + item.ID, EpisodeName: item.ID})
	}
	writeJSON(w, 201, item)
}
