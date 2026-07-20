package recommendations

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/binary"
	"errors"
	"fmt"
	"log"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/saved"
)

const (
	// Seed weights, per spec.
	weightFavorite      = 5
	weightWatchedRated  = 4
	weightWatched       = 2
	weightWatchlistHigh = 1

	strongRatingThreshold  = 8
	watchlistRatingFloor   = 7.5
	recentSeedWindow       = 30 * 24 * time.Hour
	overlapBonusPerSeed    = 2
	recencyBonus           = 1
	candidatesPerSeed      = 12
	maxSeeds               = 10
	maxConcurrentSeedFetch = 4
	defaultLimit           = 18
	maxLimit               = 30
	defaultCacheTTL        = 6 * time.Hour
	// defaultRefreshDebounce is how long after a saved-list change we keep
	// serving the cached feed before regenerating. Bounds staleness while
	// avoiding a fresh model call on every edit.
	defaultRefreshDebounce = 5 * time.Minute

	// aiVariant marks AI-enhanced cache entries so they don't collide with the
	// deterministic feed.
	aiVariant = "ai"
)

// Service generates a personalized recommendation feed from a user's saved
// signals and TMDB title-to-title recommendations.
type Service struct {
	saved      savedReader
	candidates candidateReader
	taste      tasteReader
	logger     *log.Logger
	now        func() time.Time
	db         *sql.DB

	cacheTTL        time.Duration
	refreshDebounce time.Duration
	cacheMu         sync.Mutex
	cache           map[string]cacheEntry
	// dirty maps a userID to the time after which its cached feeds must be
	// regenerated. Set on a saved-list change (debounced), cleared once the
	// grace window elapses and the caches are purged.
	dirty map[string]time.Time
}

func (s *Service) SetTasteReader(reader tasteReader) { s.taste = reader }

type cacheEntry struct {
	result  Result
	expires time.Time
}

// NewService wires the recommendations service to its saved and candidate
// sources. Either source may be nil, in which case Generate returns an empty
// result rather than erroring.
func NewService(savedSvc savedReader, candidateSvc candidateReader, db *sql.DB, logger *log.Logger) *Service {
	if logger == nil {
		logger = log.Default()
	}
	return &Service{
		saved:           savedSvc,
		candidates:      candidateSvc,
		db:              db,
		logger:          logger,
		now:             time.Now,
		cacheTTL:        defaultCacheTTL,
		refreshDebounce: defaultRefreshDebounce,
		cache:           make(map[string]cacheEntry),
		dirty:           make(map[string]time.Time),
	}
}

// SetRefreshDebounce overrides how long cached feeds keep serving after a
// saved-list change before regenerating. A non-positive value invalidates
// immediately (no debounce).
func (s *Service) SetRefreshDebounce(d time.Duration) {
	s.cacheMu.Lock()
	s.refreshDebounce = d
	s.cacheMu.Unlock()
}

// MarkDirty schedules a refresh of the user's cached feeds. The first change
// starts the debounce window; subsequent changes within it do not extend it, so
// staleness is bounded by refreshDebounce from the first edit.
func (s *Service) MarkDirty(userID string) {
	s.cacheMu.Lock()
	defer s.cacheMu.Unlock()
	if s.refreshDebounce <= 0 {
		s.purgeUserLocked(userID)
		return
	}
	if _, ok := s.dirty[userID]; !ok {
		s.dirty[userID] = s.now().Add(s.refreshDebounce)
	}
}

// CachedAI returns a cached AI-enhanced feed if one is fresh.
func (s *Service) CachedAI(userID string, limit int) (Result, bool) {
	return s.lookupCache(userID, NormalizeLimit(limit), aiVariant)
}

// StoreAI caches an AI-enhanced feed. Only successful results should be stored
// so a degraded fallback never sticks for the debounce window.
func (s *Service) StoreAI(userID string, limit int, result Result) {
	s.saveCache(userID, NormalizeLimit(limit), aiVariant, result)
}

// NormalizeLimit clamps a requested limit into the supported range.
func NormalizeLimit(limit int) int {
	if limit <= 0 {
		return defaultLimit
	}
	if limit > maxLimit {
		return maxLimit
	}
	return limit
}

// Generate builds a ranked recommendation feed for the user. It degrades
// gracefully: partial TMDB failures still produce ranked output, and a fully
// failed run returns an empty list instead of blocking the caller.
func (s *Service) Generate(ctx context.Context, userID string, limit int) (Result, error) {
	limit = NormalizeLimit(limit)
	start := s.now()

	if cached, ok := s.lookupCache(userID, limit, ""); ok {
		s.logf("recommendations cache hit user=%s limit=%d", userID, limit)
		return cached, nil
	}

	empty := Result{Items: []Item{}, Meta: Meta{GeneratedAt: start.UTC()}}
	if s.saved == nil || s.candidates == nil {
		return empty, nil
	}

	rows, err := s.saved.SeedRows(ctx, userID)
	if err != nil {
		return Result{}, fmt.Errorf("load saved rows: %w", err)
	}

	exclusions := buildExclusions(rows)
	seeds := selectSeeds(rows, s.now())
	s.applyDailyFeedback(ctx, userID, &exclusions, &seeds)
	if len(seeds) == 0 && s.taste == nil {
		s.logf("recommendations no seeds user=%s rows=%d", userID, len(rows))
		s.saveCache(userID, limit, "", empty)
		return empty, nil
	}

	candidates, failed := s.collectCandidates(ctx, seeds)
	s.addTasteCandidates(ctx, userID, candidates)

	ranked := rankCandidates(candidates, exclusions, limit)
	result := Result{
		Items: ranked,
		Meta: Meta{
			SeedCount:   len(seeds),
			GeneratedAt: s.now().UTC(),
		},
	}

	s.logf(
		"recommendations user=%s seeds=%d candidates=%d failedSeeds=%d filtered=%d final=%d took=%s",
		userID, len(seeds), len(candidates), failed, len(candidates)-len(ranked), len(ranked), s.now().Sub(start),
	)

	s.saveCache(userID, limit, "", result)
	return result, nil
}

var tasteGenreIDs = map[string]int{"action": 28, "comedy": 35, "drama": 18, "science_fiction": 878, "thriller": 53, "adventure": 12, "horror": 27, "romance": 10749, "animation": 16, "fantasy": 14, "mystery": 9648, "documentary": 99}

func (s *Service) addTasteCandidates(ctx context.Context, userID string, merged map[string]*mergedCandidate) {
	discoverer, ok := s.candidates.(discoverReader)
	if !ok || s.taste == nil {
		return
	}
	genres, err := s.taste.Rankings(ctx, userID, "genre")
	if err != nil {
		return
	}
	countries, _ := s.taste.Rankings(ctx, userID, "country")
	params := release.DiscoverParams{MediaType: "movie", SortBy: "vote_average.desc", VoteCountGTE: 100, VoteAverageGTE: 6.5}
	for _, item := range genres {
		if item.Comparisons >= 2 {
			params.WithGenres = []int{tasteGenreIDs[item.ID]}
			break
		}
	}
	for _, item := range countries {
		if item.Comparisons >= 2 {
			params.WithOriginCountry = []string{item.ID}
			break
		}
	}
	items, err := discoverer.Discover(ctx, params)
	if err != nil {
		return
	}
	for i, item := range items {
		if i >= 8 {
			break
		}
		key := candidateKey(item.TMDBID, item.MediaType)
		if _, exists := merged[key]; exists {
			continue
		}
		merged[key] = &mergedCandidate{suggestion: release.Suggestion{ID: item.TMDBID, Title: item.Title, MediaType: item.MediaType, Year: item.Year, PosterURL: item.PosterURL}, weightSum: 2, seedCount: 1, primarySource: "taste", primaryWeight: 2}
	}
}

// Daily returns one deterministic pick from the strongest personalized
// candidates. The same user receives the same title throughout a UTC day.
func (s *Service) Daily(ctx context.Context, userID string) (DailyResult, error) {
	state, err := s.DailyState(ctx, userID)
	if err != nil {
		return DailyResult{}, err
	}
	return DailyResult{Date: state.Date, Pick: state.Pick}, nil
}

func (s *Service) DailyState(ctx context.Context, userID string) (DailyState, error) {
	date := todayUTC(s.now())
	if record, err := s.loadDailyRecord(ctx, userID, date); err == nil {
		return dailyStateFromRecord(record), nil
	} else if err != nil && !errors.Is(err, sql.ErrNoRows) && !errors.Is(err, sql.ErrConnDone) {
		return DailyState{}, err
	}

	result, err := s.Generate(ctx, userID, 12)
	if err != nil {
		return DailyState{}, err
	}
	if len(result.Items) == 0 {
		return DailyState{Date: date, Action: "none"}, nil
	}
	poolSize := len(result.Items)
	if poolSize > 8 {
		poolSize = 8
	}
	digest := sha256.Sum256([]byte(userID + ":" + date))
	index := int(binary.BigEndian.Uint64(digest[:8]) % uint64(poolSize))
	pick := result.Items[index]
	if pick.Reason.Text == "" {
		pick.Reason.Text = dailyReason(pick.Reason)
	}
	if err := s.saveDailyRecord(ctx, userID, date, pick); err != nil {
		return DailyState{}, err
	}
	return DailyState{
		Date:     date,
		Pick:     &pick,
		Revealed: false,
		Action:   "none",
	}, nil
}

func (s *Service) SetDailyAction(ctx context.Context, userID, date, action string, revealed bool) (DailyState, error) {
	state, err := s.DailyState(ctx, userID)
	if err != nil {
		return DailyState{}, err
	}
	if state.Date == "" && date == "" {
		date = todayUTC(s.now())
	}
	if state.Date == "" {
		state.Date = date
	}
	if date == "" || state.Date != date {
		date = state.Date
	}
	normalized, err := normalizeDailyAction(action)
	if err != nil {
		return DailyState{}, err
	}
	if state.Pick == nil {
		return DailyState{Date: date, Revealed: revealed, Action: normalized}, nil
	}
	if err := s.updateDailyState(ctx, userID, date, normalized, revealed); err != nil {
		return DailyState{}, err
	}
	state.Revealed = revealed
	state.Action = normalized
	return state, nil
}

func (s *Service) applyDailyFeedback(ctx context.Context, userID string, exclusions *map[string]bool, seeds *[]seed) {
	feedback, err := s.dailyFeedback(ctx, userID, 24)
	if err != nil || len(feedback) == 0 {
		return
	}
	seedIndex := make(map[string]int, len(*seeds))
	for i, existing := range *seeds {
		seedIndex[existing.key()] = i
	}
	for _, item := range feedback {
		key := candidateKey(item.TMDBID, item.MediaType)
		if item.Action == "disliked" {
			(*exclusions)[key] = true
			continue
		}
		if item.Action != "saved" {
			continue
		}
		if _, exists := seedIndex[key]; exists {
			continue
		}
		*seeds = append(*seeds, seed{
			tmdbID:    item.TMDBID,
			mediaType: item.MediaType,
			weight:    weightWatchlistHigh,
			source:    "daily_saved",
			recent:    true,
		})
		seedIndex[key] = len(*seeds) - 1
	}
}

func dailyReason(reason Reason) string {
	switch reason.PrimarySource {
	case "favorite":
		return "Схоже на фільми з ваших улюблених, але залишає місце для нового відкриття."
	case "watched":
		return "Продовжує напрям переглянутих вами історій і пропонує новий крок убік."
	case "watchlist":
		return "Відібрано за мотивами сильних фільмів із вашого списку перегляду."
	case "taste":
		return "Враховує твій рейтинг жанрів і країн, але залишає простір для відкриття."
	default:
		return "Персональний вибір дня на основі вашого кінематографічного смаку."
	}
}

// buildExclusions returns the set of titles the user already knows or rejected.
func buildExclusions(rows []saved.Title) map[string]bool {
	exclusions := make(map[string]bool, len(rows))
	for _, row := range rows {
		exclusions[candidateKey(row.TMDBID, row.MediaType)] = true
	}
	return exclusions
}

// selectSeeds picks the strongest saved titles as recommendation sources,
// deduplicated by title and capped at maxSeeds, ordered by weight then recency.
func selectSeeds(rows []saved.Title, now time.Time) []seed {
	best := make(map[string]seed)
	for _, row := range rows {
		weight, source, ok := seedWeight(row)
		if !ok {
			continue
		}
		recent := false
		if !row.UpdatedAt.IsZero() {
			recent = now.Sub(row.UpdatedAt) <= recentSeedWindow
		}
		candidate := seed{
			tmdbID:    row.TMDBID,
			mediaType: row.MediaType,
			weight:    weight,
			source:    source,
			recent:    recent,
		}
		existing, exists := best[candidate.key()]
		if !exists || candidate.weight > existing.weight {
			// Preserve recency if any contributing row is recent.
			candidate.recent = candidate.recent || (exists && existing.recent)
			best[candidate.key()] = candidate
		} else if existing.weight == candidate.weight {
			existing.recent = existing.recent || candidate.recent
			best[candidate.key()] = existing
		}
	}

	seeds := make([]seed, 0, len(best))
	for _, value := range best {
		seeds = append(seeds, value)
	}
	sort.SliceStable(seeds, func(i, j int) bool {
		if seeds[i].weight != seeds[j].weight {
			return seeds[i].weight > seeds[j].weight
		}
		if seeds[i].recent != seeds[j].recent {
			return seeds[i].recent
		}
		return seeds[i].tmdbID < seeds[j].tmdbID
	})
	if len(seeds) > maxSeeds {
		seeds = seeds[:maxSeeds]
	}
	return seeds
}

// seedWeight returns the seed weight and source label for a saved row, or
// ok=false if the row is not eligible as a seed.
func seedWeight(row saved.Title) (int, string, bool) {
	listType := rowListType(row)
	switch listType {
	case "favorite":
		return weightFavorite, "favorite", true
	case "watched":
		if row.UserRating != nil && *row.UserRating >= strongRatingThreshold {
			return weightWatchedRated, "watched", true
		}
		return weightWatched, "watched", true
	case "watchlist":
		if row.TMDBRating != nil && *row.TMDBRating >= watchlistRatingFloor {
			return weightWatchlistHigh, "watchlist", true
		}
		return 0, "", false
	default:
		return 0, "", false
	}
}

func rowListType(row saved.Title) string {
	if len(row.ListTypes) == 0 {
		return ""
	}
	return strings.ToLower(strings.TrimSpace(row.ListTypes[0]))
}

// mergedCandidate accumulates signal from every seed that produced a title.
type mergedCandidate struct {
	suggestion    release.Suggestion
	weightSum     int
	seedCount     int
	recent        bool
	primarySource string
	primaryWeight int
}

// collectCandidates fans out TMDB recommendation requests across seeds with
// bounded concurrency and merges duplicates. Returns the merged candidates and
// the number of seeds whose fetch failed.
func (s *Service) collectCandidates(ctx context.Context, seeds []seed) (map[string]*mergedCandidate, int) {
	type seedResult struct {
		seed        seed
		suggestions []release.Suggestion
		err         error
	}

	results := make([]seedResult, len(seeds))
	sem := make(chan struct{}, maxConcurrentSeedFetch)
	var wg sync.WaitGroup
	for i, sd := range seeds {
		wg.Add(1)
		go func(i int, sd seed) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			suggestions, err := s.candidates.Recommendations(ctx, sd.tmdbID, sd.mediaType, candidatesPerSeed)
			results[i] = seedResult{seed: sd, suggestions: suggestions, err: err}
		}(i, sd)
	}
	wg.Wait()

	merged := make(map[string]*mergedCandidate)
	failed := 0
	for _, res := range results {
		if res.err != nil {
			failed++
			s.logf("recommendations seed fetch failed tmdbId=%d mediaType=%s: %v", res.seed.tmdbID, res.seed.mediaType, res.err)
			continue
		}
		for _, suggestion := range res.suggestions {
			if suggestion.ID <= 0 {
				continue
			}
			key := candidateKey(suggestion.ID, suggestion.MediaType)
			entry, ok := merged[key]
			if !ok {
				entry = &mergedCandidate{suggestion: suggestion}
				merged[key] = entry
			}
			entry.seedCount++
			entry.weightSum += res.seed.weight
			entry.recent = entry.recent || res.seed.recent
			if res.seed.weight > entry.primaryWeight {
				entry.primaryWeight = res.seed.weight
				entry.primarySource = res.seed.source
			}
		}
	}
	return merged, failed
}

// rankCandidates applies exclusions, scores, and sorts candidates into the
// final ranked list, truncated to limit.
func rankCandidates(candidates map[string]*mergedCandidate, exclusions map[string]bool, limit int) []Item {
	type scored struct {
		item  Item
		score int
	}
	scoredItems := make([]scored, 0, len(candidates))
	for key, candidate := range candidates {
		if exclusions[key] {
			continue
		}
		score := candidate.weightSum
		if candidate.seedCount > 1 {
			score += (candidate.seedCount - 1) * overlapBonusPerSeed
		}
		if candidate.recent {
			score += recencyBonus
		}
		scoredItems = append(scoredItems, scored{
			score: score,
			item: Item{
				TMDBID:    candidate.suggestion.ID,
				MediaType: candidate.suggestion.MediaType,
				Title:     candidate.suggestion.Title,
				Year:      candidate.suggestion.Year,
				PosterURL: candidate.suggestion.PosterURL,
				Reason: Reason{
					SeedCount:     candidate.seedCount,
					PrimarySource: candidate.primarySource,
				},
			},
		})
	}

	sort.SliceStable(scoredItems, func(i, j int) bool {
		if scoredItems[i].score != scoredItems[j].score {
			return scoredItems[i].score > scoredItems[j].score
		}
		if scoredItems[i].item.Reason.SeedCount != scoredItems[j].item.Reason.SeedCount {
			return scoredItems[i].item.Reason.SeedCount > scoredItems[j].item.Reason.SeedCount
		}
		return scoredItems[i].item.TMDBID < scoredItems[j].item.TMDBID
	})

	if len(scoredItems) > limit {
		scoredItems = scoredItems[:limit]
	}
	items := make([]Item, 0, len(scoredItems))
	for _, entry := range scoredItems {
		items = append(items, entry.item)
	}
	return items
}

func candidateKey(tmdbID int, mediaType string) string {
	return fmt.Sprintf("%s:%d", strings.ToLower(strings.TrimSpace(mediaType)), tmdbID)
}

func (s *Service) lookupCache(userID string, limit int, variant string) (Result, bool) {
	if s.cacheTTL <= 0 {
		return Result{}, false
	}
	s.cacheMu.Lock()
	defer s.cacheMu.Unlock()

	// A pending change whose debounce window has elapsed purges every cached
	// feed for the user, so both variants regenerate exactly once.
	if deadline, ok := s.dirty[userID]; ok && !s.now().Before(deadline) {
		s.purgeUserLocked(userID)
		delete(s.dirty, userID)
		return Result{}, false
	}

	key := cacheKey(userID, limit, variant)
	entry, ok := s.cache[key]
	if !ok || s.now().After(entry.expires) {
		if ok {
			delete(s.cache, key)
		}
		return Result{}, false
	}
	return entry.result, true
}

func (s *Service) saveCache(userID string, limit int, variant string, result Result) {
	if s.cacheTTL <= 0 {
		return
	}
	key := cacheKey(userID, limit, variant)
	s.cacheMu.Lock()
	s.cache[key] = cacheEntry{result: result, expires: s.now().Add(s.cacheTTL)}
	s.cacheMu.Unlock()
}

func (s *Service) ClearCache() {
	s.cacheMu.Lock()
	s.cache = make(map[string]cacheEntry)
	s.dirty = make(map[string]time.Time)
	s.cacheMu.Unlock()
}

// purgeUserLocked removes every cached feed for a user. Callers must hold cacheMu.
func (s *Service) purgeUserLocked(userID string) {
	prefix := fmt.Sprintf("recommendations:user:%s:", userID)
	for key := range s.cache {
		if strings.HasPrefix(key, prefix) {
			delete(s.cache, key)
		}
	}
}

func cacheKey(userID string, limit int, variant string) string {
	key := fmt.Sprintf("recommendations:user:%s:v1:%d", userID, limit)
	if variant != "" {
		key += ":" + variant
	}
	return key
}

func (s *Service) logf(format string, args ...any) {
	if s.logger != nil {
		s.logger.Printf(format, args...)
	}
}
