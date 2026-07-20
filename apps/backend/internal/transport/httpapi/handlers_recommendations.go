package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/airecs"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/capabilities"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/recommendations"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/saved"
)

// aiPoolLimit is the candidate pool size handed to the model when ?ai=1. Larger
// than the returned limit so the model has room to re-rank.
const aiPoolLimit = 30

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
	limit = recommendations.NormalizeLimit(limit)

	wantAI := parseBoolParam(r.URL.Query().Get("ai"))
	if wantAI && s.ai != nil && s.saved != nil &&
		s.aiEnabled(r.Context(), userID, capabilities.AIRecommendations) {
		if cached, ok := s.recommendations.CachedAI(userID, limit); ok {
			writeJSON(w, http.StatusOK, cached)
			return
		}
		if result, ok := s.aiRecommendations(r.Context(), userID, limit); ok {
			s.recommendations.StoreAI(userID, limit, result)
			writeJSON(w, http.StatusOK, result)
			return
		}
		// Any failure falls through to the deterministic path below (not cached).
	}

	result, err := s.recommendations.Generate(r.Context(), userID, limit)
	if err != nil {
		// Degrade gracefully: never block the home page on a recommendation failure.
		s.logger.Printf("recommendations generation failed: %v", err)
		writeJSON(w, http.StatusOK, recommendations.Result{Items: []recommendations.Item{}})
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (s *Server) dailyRecommendationHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.handleDailyRecommendationGet(w, r)
	case http.MethodPost:
		s.handleDailyRecommendationPost(w, r)
	default:
		methodNotAllowed(w)
	}
}

type dailyRecommendationUpdateRequest struct {
	Date     string `json:"date"`
	Revealed bool   `json:"revealed"`
	Action   string `json:"action"`
}

func (s *Server) handleDailyRecommendationGet(w http.ResponseWriter, r *http.Request) {
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.recommendations == nil {
		writeError(w, http.StatusServiceUnavailable, "recommendations unavailable")
		return
	}
	result, err := s.recommendations.DailyState(r.Context(), userID)
	if err != nil {
		s.logger.Printf("daily recommendation failed: %v", err)
		writeError(w, http.StatusInternalServerError, "daily recommendation failed")
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) handleDailyRecommendationPost(w http.ResponseWriter, r *http.Request) {
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.recommendations == nil {
		writeError(w, http.StatusServiceUnavailable, "recommendations unavailable")
		return
	}
	var payload dailyRecommendationUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	result, err := s.recommendations.SetDailyAction(r.Context(), userID, payload.Date, payload.Action, payload.Revealed)
	if err != nil {
		if err == recommendations.ErrInvalidDailyAction {
			writeError(w, http.StatusBadRequest, "invalid daily action")
			return
		}
		s.logger.Printf("daily recommendation update failed: %v", err)
		writeError(w, http.StatusInternalServerError, "daily recommendation update failed")
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) similarRecommendationsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	id, e := strconv.Atoi(r.URL.Query().Get("tmdbId"))
	media := strings.TrimSpace(r.URL.Query().Get("mediaType"))
	if id <= 0 || (media != "movie" && media != "tv") {
		writeError(w, 400, "invalid title")
		return
	}
	items, e := s.releases.Recommendations(r.Context(), id, media, 8)
	if e != nil {
		writeError(w, 500, "similar failed")
		return
	}
	writeJSON(w, 200, map[string]any{"items": items})
}

// aiRecommendations builds a candidate pool with the deterministic engine, then
// asks Gemini to select and explain the best picks. Returns ok=false on any
// failure so the caller can fall back to the deterministic feed.
func (s *Server) aiRecommendations(ctx context.Context, userID string, limit int) (recommendations.Result, bool) {
	pool, err := s.recommendations.Generate(ctx, userID, recommendations.NormalizeLimit(aiPoolLimit))
	if err != nil || len(pool.Items) == 0 {
		return recommendations.Result{}, false
	}

	rows, err := s.saved.SeedRows(ctx, userID)
	if err != nil {
		s.logger.Printf("ai recommendations: load saved rows failed: %v", err)
		return recommendations.Result{}, false
	}

	candidates := candidatesFromItems(pool.Items)
	profile := tasteSignals(rows)
	profile = append(profile, s.rankedTasteSignals(ctx, userID)...)

	selections, err := s.ai.Rerank(ctx, profile, candidates, limit)
	if err != nil {
		s.logger.Printf("ai recommendations: rerank failed: %v", err)
		return recommendations.Result{}, false
	}
	if len(selections) == 0 {
		return recommendations.Result{}, false
	}

	byKey := make(map[string]recommendations.Item, len(pool.Items))
	for _, item := range pool.Items {
		byKey[recKey(item.TMDBID, item.MediaType)] = item
	}

	ordered := make([]recommendations.Item, 0, len(selections))
	for _, sel := range selections {
		item, ok := byKey[recKey(sel.TMDBID, sel.MediaType)]
		if !ok {
			continue
		}
		item.Reason.Text = sel.Reason
		ordered = append(ordered, item)
	}
	if len(ordered) == 0 {
		return recommendations.Result{}, false
	}

	result := pool
	result.Items = ordered
	return result, true
}

func (s *Server) rankedTasteSignals(ctx context.Context, userID string) []airecs.TasteSignal {
	if s.taste == nil {
		return nil
	}
	var signals []airecs.TasteSignal
	for _, kind := range []string{"genre", "country"} {
		items, err := s.taste.Rankings(ctx, userID, kind)
		if err != nil {
			s.logger.Printf("ai recommendations: load %s taste failed: %v", kind, err)
			continue
		}
		for _, item := range items {
			if item.Comparisons < 2 || item.Confidence < 0.25 {
				continue
			}
			signals = append(signals, airecs.TasteSignal{
				Title:     "Preferred " + kind + ": " + item.ID,
				MediaType: "preference",
				Sentiment: "favorite",
			})
			if len(signals) >= 6 {
				return signals
			}
		}
	}
	return signals
}

func candidatesFromItems(items []recommendations.Item) []airecs.Candidate {
	candidates := make([]airecs.Candidate, 0, len(items))
	for _, item := range items {
		candidates = append(candidates, airecs.Candidate{
			TMDBID:    item.TMDBID,
			MediaType: item.MediaType,
			Title:     item.Title,
			Year:      item.Year,
		})
	}
	return candidates
}

// tasteSignals distils a user's saved rows into a compact taste profile the
// model can reason over. Status lists carry the strongest signal.
func tasteSignals(rows []saved.Title) []airecs.TasteSignal {
	signals := make([]airecs.TasteSignal, 0, len(rows))
	for _, row := range rows {
		sentiment := sentimentFor(row)
		if sentiment == "" {
			continue
		}
		signal := airecs.TasteSignal{
			Title:     row.Title,
			MediaType: row.MediaType,
			Sentiment: sentiment,
		}
		if row.UserRating != nil {
			signal.Rating = *row.UserRating
		}
		signals = append(signals, signal)
	}
	return signals
}

// sentimentFor picks the single strongest sentiment for a saved row.
func sentimentFor(row saved.Title) string {
	has := func(target string) bool {
		for _, lt := range row.ListTypes {
			if strings.EqualFold(strings.TrimSpace(lt), target) {
				return true
			}
		}
		return false
	}
	switch {
	case has("favorite"):
		return "favorite"
	case has("disliked"):
		return "disliked"
	case has("watched"):
		if row.UserRating != nil && *row.UserRating >= 8 {
			return "loved"
		}
		return "watched"
	case has("watchlist"):
		return "watchlist"
	default:
		return ""
	}
}

func recKey(id int, mediaType string) string {
	return strings.ToLower(strings.TrimSpace(mediaType)) + ":" + strconv.Itoa(id)
}

func parseBoolParam(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}
