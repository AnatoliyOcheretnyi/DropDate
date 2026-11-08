package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/airecs"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/capabilities"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/discoverydata"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/saved"
)

// Public metadata only. Personalized lists are never stored in this cache.
type discoveryCache struct {
	mu      sync.Mutex
	entries map[string]discoveryEntry
}
type discoveryEntry struct {
	expires time.Time
	items   []release.DiscoverItem
	details release.Details
}

func (c *discoveryCache) get(key string) (discoveryEntry, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	value, ok := c.entries[key]
	return value, ok && time.Now().Before(value.expires)
}
func (c *discoveryCache) put(key string, value discoveryEntry) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.entries == nil {
		c.entries = make(map[string]discoveryEntry)
	}
	if len(c.entries) >= 1000 {
		for k, v := range c.entries {
			if time.Now().After(v.expires) {
				delete(c.entries, k)
			}
		}
		if len(c.entries) >= 1000 {
			for k := range c.entries {
				delete(c.entries, k)
				break
			}
		}
	}
	c.entries[key] = value
}
func (s *Server) cachedDiscover(ctx context.Context, p release.DiscoverParams) ([]release.DiscoverItem, error) {
	raw, _ := json.Marshal(p)
	key := "discover:" + string(raw)
	if entry, ok := s.discovery.get(key); ok {
		return append([]release.DiscoverItem(nil), entry.items...), nil
	}
	items, err := s.releases.Discover(ctx, p)
	if err == nil {
		s.discovery.put(key, discoveryEntry{expires: time.Now().Add(30 * time.Minute), items: items})
	}
	return items, err
}
func (s *Server) discoveryDetails(ctx context.Context, id int, media string) (release.Details, error) {
	key := fmt.Sprintf("details:%s:%d", media, id)
	if entry, ok := s.discovery.get(key); ok {
		return entry.details, nil
	}
	details, err := s.releases.Details(ctx, id, media)
	if err == nil {
		s.discovery.put(key, discoveryEntry{expires: time.Now().Add(24 * time.Hour), details: details})
	}
	return details, err
}

type worldItem struct {
	release.DiscoverItem
	Country   string   `json:"country,omitempty"`
	Reason    string   `json:"reason"`
	Runtime   int      `json:"runtime,omitempty"`
	Genres    []string `json:"genres,omitempty"`
	Countries []string `json:"countries,omitempty"`
}
type worldResult struct {
	Items     []worldItem `json:"items"`
	AIUsed    bool        `json:"aiUsed"`
	Partial   bool        `json:"partial"`
	Exhausted bool        `json:"exhausted"`
}
type worldFilters struct {
	country, mode, region        string
	genre, decade, runtime, page int
	providers                    []int
}

func boundedInt(raw string, min, max int) (int, bool) {
	if raw == "" {
		return 0, true
	}
	n, e := strconv.Atoi(raw)
	return n, e == nil && n >= min && n <= max
}
func parseWorldFilters(r *http.Request) (worldFilters, error) {
	q := r.URL.Query()
	f := worldFilters{country: strings.ToUpper(q.Get("country")), mode: q.Get("mode"), region: strings.ToUpper(q.Get("region"))}
	if f.mode == "" {
		f.mode = "top"
	}
	if f.country != "" && !discoverydata.Valid(f.country) {
		return f, fmt.Errorf("unknown country")
	}
	if f.region != "" && !discoverydata.Valid(f.region) {
		return f, fmt.Errorf("unknown watch region")
	}
	switch f.mode {
	case "top", "popular", "gems", "personal", "new":
	default:
		return f, fmt.Errorf("unknown mode")
	}
	var ok bool
	if f.genre, ok = boundedInt(q.Get("genre"), 1, 20000); !ok {
		return f, fmt.Errorf("invalid genre")
	}
	if f.decade, ok = boundedInt(q.Get("decade"), 1880, (time.Now().Year()/10)*10); !ok || f.decade%10 != 0 {
		return f, fmt.Errorf("invalid decade")
	}
	if f.runtime, ok = boundedInt(q.Get("runtime"), 40, 360); !ok {
		return f, fmt.Errorf("invalid runtime")
	}
	if f.page, ok = boundedInt(q.Get("page"), 1, 10); !ok {
		return f, fmt.Errorf("invalid page")
	}
	if f.page == 0 {
		f.page = 1
	}
	if q.Get("providers") != "" {
		parts := strings.Split(q.Get("providers"), ",")
		if len(parts) > 10 || f.region == "" {
			return f, fmt.Errorf("invalid providers")
		}
		for _, p := range parts {
			id, valid := boundedInt(p, 1, 100000)
			if !valid || id == 0 {
				return f, fmt.Errorf("invalid provider")
			}
			f.providers = append(f.providers, id)
		}
	}
	return f, nil
}

// Bayesian shrinkage prevents a handful of perfect votes from dominating.
// This ranks the retrieved shortlist, not an exhaustive national canon.
func worldQuality(item release.DiscoverItem) float64 {
	v := float64(item.VoteCount)
	return (v*item.Rating + 50*6.5) / (v + 50)
}
func (s *Server) worldPool(ctx context.Context, f worldFilters) ([]release.DiscoverItem, bool) {
	p := release.DiscoverParams{MediaType: "movie", SortBy: "vote_average.desc", VoteCountGTE: 10, ReleaseDateLTE: time.Now().UTC().Format("2006-01-02"), RuntimeLTE: f.runtime, WatchRegion: f.region, WatchProviders: f.providers}
	if f.runtime > 0 {
		p.RuntimeGTE = 1
	}
	if f.country != "" {
		p.WithOriginCountry = []string{f.country}
	}
	if f.genre > 0 {
		p.WithGenres = []int{f.genre}
	}
	if f.decade > 0 {
		p.ReleaseDateGTE = fmt.Sprintf("%d-01-01", f.decade)
		end := fmt.Sprintf("%d-12-31", f.decade+9)
		if end < p.ReleaseDateLTE {
			p.ReleaseDateLTE = end
		}
	}
	if f.mode == "popular" {
		p.SortBy = "popularity.desc"
	}
	if f.mode == "gems" {
		p.VoteAverageGTE = 6.5
		p.VoteCountLTE = 1500
	}
	if f.mode == "new" {
		p.SortBy = "primary_release_date.desc"
		p.ReleaseDateGTE = time.Now().AddDate(0, -3, 0).Format("2006-01-02")
		p.VoteCountGTE = 5
	}
	type batch struct {
		items []release.DiscoverItem
		err   error
	}
	batches := make([]batch, 3)
	var wg sync.WaitGroup
	for i := range batches {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			params := p
			params.Page = (f.page-1)*3 + i + 1
			if f.mode == "personal" && i == 2 {
				params.SortBy = "popularity.desc"
			}
			batches[i].items, batches[i].err = s.cachedDiscover(ctx, params)
		}(i)
	}
	wg.Wait()
	out := []release.DiscoverItem{}
	seen := map[int]bool{}
	partial := false
	for _, b := range batches {
		if b.err != nil {
			partial = true
			continue
		}
		for _, item := range b.items {
			if seen[item.TMDBID] || item.PosterURL == "" {
				continue
			}
			if f.mode == "gems" && item.VoteCount > 1500 {
				continue
			}
			seen[item.TMDBID] = true
			out = append(out, item)
		}
	}
	sort.SliceStable(out, func(i, j int) bool {
		if f.mode == "popular" {
			return out[i].Popularity > out[j].Popularity
		}
		if f.mode == "new" && out[i].Year != out[j].Year {
			return out[i].Year > out[j].Year
		}
		return worldQuality(out[i]) > worldQuality(out[j])
	})
	return out, partial
}
func watchedTitle(row saved.Title) bool {
	if row.WatchCount > 0 || row.LastWatched != nil {
		return true
	}
	for _, kind := range row.ListTypes {
		if kind == "watched" {
			return true
		}
	}
	return false
}
func (s *Server) enrichWorld(ctx context.Context, items []worldItem) {
	var wg sync.WaitGroup
	sem := make(chan struct{}, 6)
	for i := range items {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			select {
			case sem <- struct{}{}:
			case <-ctx.Done():
				return
			}
			defer func() { <-sem }()
			d, e := s.discoveryDetails(ctx, items[i].TMDBID, items[i].MediaType)
			if e == nil {
				items[i].Runtime = d.Runtime
				items[i].Genres = d.Genres
				items[i].Countries = d.OriginCountry
				if items[i].Overview == "" {
					items[i].Overview = d.Overview
				}
			}
		}(i)
	}
	wg.Wait()
}
func (s *Server) worldHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	if s.releases == nil {
		writeError(w, 503, "discovery unavailable")
		return
	}
	f, e := parseWorldFilters(r)
	if e != nil {
		writeError(w, 400, e.Error())
		return
	}
	seedID, validSeed := boundedInt(r.URL.Query().Get("seed"), 1, 100000000)
	if !validSeed || len([]rune(r.URL.Query().Get("intent"))) > 240 {
		writeError(w, 400, "invalid refinement")
		return
	}
	userID, _ := s.requireUserID(r)
	if f.mode == "personal" && userID == "" {
		writeError(w, 401, "Увійди для персональної добірки")
		return
	}
	var rows []saved.Title
	if userID != "" && s.saved != nil {
		rows, e = s.saved.SeedRows(r.Context(), userID)
		if e != nil {
			writeError(w, 503, "Не вдалося прочитати твій список")
			return
		}
	}
	excluded := map[string]bool{}
	for _, row := range rows {
		for _, kind := range row.ListTypes {
			if kind == "disliked" {
				excluded[recKey(row.TMDBID, row.MediaType)] = true
			}
		}
		if r.URL.Query().Get("hideWatched") == "1" && watchedTitle(row) {
			excluded[recKey(row.TMDBID, row.MediaType)] = true
		}
	}
	if userID != "" && s.recommendations != nil {
		feedback, _ := s.recommendations.Feedback(r.Context(), userID)
		for _, v := range feedback {
			if v.Action == "disliked" {
				excluded[recKey(v.TMDBID, v.MediaType)] = true
			}
		}
	}
	for _, key := range strings.Split(r.URL.Query().Get("exclude"), ",") {
		excluded[key] = true
	}
	pool, partial := s.worldPool(r.Context(), f)
	if partial && len(pool) == 0 {
		writeError(w, 502, "Не вдалося завантажити фільми. Спробуй ще раз.")
		return
	}
	result := worldResult{Items: []worldItem{}, Partial: partial}
	for _, item := range pool {
		if excluded[recKey(item.TMDBID, item.MediaType)] || item.TMDBID == seedID {
			continue
		}
		reason := "Висока оцінка з урахуванням кількості голосів"
		if f.mode == "popular" {
			reason = "Популярне зараз у каталозі TMDB"
		}
		if f.mode == "gems" {
			reason = "Висока оцінка та менше 1500 голосів у TMDB"
		}
		result.Items = append(result.Items, worldItem{DiscoverItem: item, Country: f.country, Reason: reason})
	}
	// Seed similarity also works when Gemini is disabled or times out.
	if f.mode == "personal" && s.recommendations != nil {
		recs, _ := s.recommendations.Generate(r.Context(), userID, 30)
		scores := map[int]int{}
		for i, item := range recs.Items {
			if item.MediaType == "movie" {
				scores[item.TMDBID] = len(recs.Items) - i
			}
		}

		sort.SliceStable(result.Items, func(i, j int) bool { return scores[result.Items[i].TMDBID] > scores[result.Items[j].TMDBID] })
	}
	if len(result.Items) > 30 {
		result.Items = result.Items[:30]
	}
	enrichCtx, cancel := context.WithTimeout(r.Context(), 2500*time.Millisecond)
	s.enrichWorld(enrichCtx, result.Items)
	cancel()
	// Discover can match a regional runtime that differs from title details.
	// Apply the visible runtime as the final constraint; unknown durations are
	// excluded too, so a time-limited pick never makes an unverified promise.
	if f.runtime > 0 {
		eligible := make([]worldItem, 0, len(result.Items))
		for _, item := range result.Items {
			if item.Runtime > 0 && item.Runtime <= f.runtime {
				eligible = append(eligible, item)
			}
			if item.Runtime == 0 {
				result.Partial = true
			}
		}
		result.Items = eligible
	}
	if f.mode == "personal" {
		preferred := map[string]int{}
		for _, row := range rows {
			sentiment := sentimentFor(row)
			weight := 0
			if sentiment == "favorite" || sentiment == "loved" {
				weight = 2
			}
			if sentiment == "disliked" {
				weight = -2
			}
			for _, g := range row.Genres {
				preferred[strings.ToLower(g)] += weight
			}
		}
		score := func(item worldItem) float64 {
			value := worldQuality(item.DiscoverItem)
			for _, g := range item.Genres {
				value += float64(preferred[strings.ToLower(g)]) * .3
			}
			return value
		}
		sort.SliceStable(result.Items, func(i, j int) bool { return score(result.Items[i]) > score(result.Items[j]) })
		for i := range result.Items {
			for _, g := range result.Items[i].Genres {
				if preferred[strings.ToLower(g)] > 0 {
					result.Items[i].Reason = "Ти високо оцінюєш фільми жанру «" + g + "»"
					break
				}
			}
		}
		profile := append(s.rankedTasteSignals(r.Context(), userID), tasteSignals(rows)...)
		if seedID > 0 {
			if d, e := s.discoveryDetails(r.Context(), seedID, "movie"); e == nil {
				overview := []rune(d.Overview)
				if len(overview) > 600 {
					overview = overview[:600]
				}
				profile = append([]airecs.TasteSignal{{Title: d.Title + ". " + string(overview), MediaType: "movie", Sentiment: "reference_for_this_session"}}, profile...)
			}
		}
		if q := strings.TrimSpace(r.URL.Query().Get("intent")); q != "" {
			profile = append([]airecs.TasteSignal{{Title: string([]rune(q)[:min(len([]rune(q)), 240)]), Sentiment: "tonight"}}, profile...)
		}
		result.Items, result.AIUsed = s.rerankWorld(r.Context(), userID, profile, result.Items)
	}
	if len(result.Items) > 18 {
		result.Items = result.Items[:18]
	}
	result.Exhausted = len(result.Items) == 0
	w.Header().Set("Cache-Control", "private, no-store")
	writeJSON(w, 200, result)
}
func (s *Server) rerankWorld(ctx context.Context, userID string, profile []airecs.TasteSignal, items []worldItem) ([]worldItem, bool) {
	if s.ai == nil || !s.aiEnabled(ctx, userID, capabilities.AIRecommendations) || len(items) == 0 {
		return items, false
	}
	pool := make([]airecs.Candidate, 0, len(items))
	byID := map[string]worldItem{}
	for _, v := range items {
		pool = append(pool, airecs.Candidate{TMDBID: v.TMDBID, MediaType: v.MediaType, Title: v.Title, Year: v.Year, Overview: v.Overview, Genres: v.Genres, Countries: v.Countries, Runtime: v.Runtime})
		byID[recKey(v.TMDBID, v.MediaType)] = v
	}
	aiCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()
	picks, err := s.ai.Rerank(aiCtx, profile, pool, min(18, len(items)))
	if err != nil || len(picks) == 0 {
		return items, false
	}
	out := make([]worldItem, 0, len(items))
	seen := map[string]bool{}
	for _, p := range picks {
		key := recKey(p.TMDBID, p.MediaType)
		if item, ok := byID[key]; ok {
			item.Reason = p.Reason
			out = append(out, item)
			seen[key] = true
		}
	}
	for _, item := range items {
		if !seen[recKey(item.TMDBID, item.MediaType)] {
			out = append(out, item)
		}
	}
	return out, true
}

// passportMovies counts each movie once across all viewing-status lists.
// Interest-only memberships (watchlist/follow) do not count, even if a row
// retains historical watch metadata after being moved between lists.
func passportMovies(rows []saved.Title) []saved.Title {
	items := make([]saved.Title, 0)
	seen := make(map[int]bool)
	for _, row := range rows {
		if row.MediaType != "movie" || row.TMDBID <= 0 || seen[row.TMDBID] {
			continue
		}
		viewed := false
		for _, kind := range row.ListTypes {
			switch kind {
			case "favorite", "liked", "watched", "disliked":
				viewed = true
			}
		}
		if viewed {
			seen[row.TMDBID] = true
			items = append(items, row)
		}
	}
	sort.Slice(items, func(i, j int) bool { return items[i].TMDBID < items[j].TMDBID })
	return items
}

// Passport counts viewing-status titles, never country clicks. Cursor pagination keeps
// large libraries bounded; missing metadata is reported, not silently counted.
func (s *Server) passportHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, 401, "unauthorized")
		return
	}
	if s.saved == nil || s.releases == nil {
		writeError(w, 503, "passport unavailable")
		return
	}
	offset, ok := boundedInt(r.URL.Query().Get("offset"), 0, 100000)
	if !ok {
		writeError(w, 400, "invalid offset")
		return
	}
	rows, err := s.saved.SeedRows(r.Context(), userID)
	if err != nil {
		writeError(w, 503, "passport unavailable")
		return
	}
	watched := passportMovies(rows)
	end := min(offset+20, len(watched))
	offset = min(offset, len(watched))
	items := make([]worldItem, 0, end-offset)
	for _, row := range watched[offset:end] {
		items = append(items, worldItem{DiscoverItem: release.DiscoverItem{TMDBID: row.TMDBID, MediaType: "movie"}})
	}
	s.enrichWorld(r.Context(), items)
	counts := map[string]int{}
	missing := 0
	for _, item := range items {
		if len(item.Countries) == 0 {
			missing++
		}
		seen := map[string]bool{}
		for _, code := range item.Countries {
			if !seen[code] {
				counts[code]++
				seen[code] = true
			}
		}
	}
	next := -1
	if end < len(watched) {
		next = end
	}
	w.Header().Set("Cache-Control", "private, no-store")
	writeJSON(w, 200, map[string]any{"countries": counts, "totalWatched": len(watched), "missing": missing, "nextOffset": next})
}
