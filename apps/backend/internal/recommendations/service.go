package recommendations

import (
	"context"
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
)

// Service generates a personalized recommendation feed from a user's saved
// signals and TMDB title-to-title recommendations.
type Service struct {
	saved      savedReader
	candidates candidateReader
	logger     *log.Logger
	now        func() time.Time

	cacheTTL time.Duration
	cacheMu  sync.Mutex
	cache    map[string]cacheEntry
}

type cacheEntry struct {
	result  Result
	expires time.Time
}

// NewService wires the recommendations service to its saved and candidate
// sources. Either source may be nil, in which case Generate returns an empty
// result rather than erroring.
func NewService(savedSvc savedReader, candidateSvc candidateReader, logger *log.Logger) *Service {
	if logger == nil {
		logger = log.Default()
	}
	return &Service{
		saved:      savedSvc,
		candidates: candidateSvc,
		logger:     logger,
		now:        time.Now,
		cacheTTL:   defaultCacheTTL,
		cache:      make(map[string]cacheEntry),
	}
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

	if cached, ok := s.lookupCache(userID, limit); ok {
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
	if len(seeds) == 0 {
		s.logf("recommendations no seeds user=%s rows=%d", userID, len(rows))
		s.saveCache(userID, limit, empty)
		return empty, nil
	}

	candidates, failed := s.collectCandidates(ctx, seeds)

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

	s.saveCache(userID, limit, result)
	return result, nil
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

func (s *Service) lookupCache(userID string, limit int) (Result, bool) {
	if s.cacheTTL <= 0 {
		return Result{}, false
	}
	key := cacheKey(userID, limit)
	s.cacheMu.Lock()
	defer s.cacheMu.Unlock()
	entry, ok := s.cache[key]
	if !ok || s.now().After(entry.expires) {
		if ok {
			delete(s.cache, key)
		}
		return Result{}, false
	}
	return entry.result, true
}

func (s *Service) saveCache(userID string, limit int, result Result) {
	if s.cacheTTL <= 0 {
		return
	}
	key := cacheKey(userID, limit)
	s.cacheMu.Lock()
	s.cache[key] = cacheEntry{result: result, expires: s.now().Add(s.cacheTTL)}
	s.cacheMu.Unlock()
}

func cacheKey(userID string, limit int) string {
	return fmt.Sprintf("recommendations:user:%s:v1:%d", userID, limit)
}

func (s *Service) logf(format string, args ...any) {
	if s.logger != nil {
		s.logger.Printf(format, args...)
	}
}
