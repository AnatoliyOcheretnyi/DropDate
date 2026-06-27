package games

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"strings"
	"sync"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
)

const (
	defaultCount = 5
	maxCount     = 20

	// poolSize caps how many distinct titles we enrich/consider per request.
	poolSize        = 30
	perListFetch    = 20
	maxConcurrency  = 6
	ratingMinGap    = 0.4
	maxPairAttempts = 200
)

var prompts = map[Mode]string{
	ModeReleaseDate: "Який фільм вийшов раніше?",
	ModeRating:      "У якого фільму вищий рейтинг TMDB?",
}

// Service generates comparison questions from TMDB-backed catalog data.
type Service struct {
	catalog catalogSource
	logger  *log.Logger
	now     func() time.Time
	rng     *rand.Rand
	rngMu   sync.Mutex
}

// NewService wires the games service to its catalog source.
func NewService(catalog catalogSource, logger *log.Logger) *Service {
	if logger == nil {
		logger = log.Default()
	}
	return &Service{
		catalog: catalog,
		logger:  logger,
		now:     time.Now,
		rng:     rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// SupportedMode reports whether a mode string maps to a known v1 game mode.
func SupportedMode(value string) (Mode, bool) {
	switch Mode(strings.TrimSpace(strings.ToLower(value))) {
	case ModeReleaseDate:
		return ModeReleaseDate, true
	case ModeRating:
		return ModeRating, true
	default:
		return "", false
	}
}

// NormalizeCount clamps a requested question count into the supported range.
func NormalizeCount(count int) int {
	if count <= 0 {
		return defaultCount
	}
	if count > maxCount {
		return maxCount
	}
	return count
}

// Generate builds a set of comparison questions for the requested mode. Movie
// scope only in v1.
func (s *Service) Generate(ctx context.Context, mode Mode, count int) (Questions, error) {
	count = NormalizeCount(count)
	start := s.now()

	if s.catalog == nil {
		return Questions{Items: []Question{}, Meta: s.meta(mode, 0)}, nil
	}

	pool, err := s.buildPool(ctx, mode)
	if err != nil {
		return Questions{}, err
	}

	questions := s.buildQuestions(mode, pool, count)
	s.logf("games questions mode=%s pool=%d requested=%d generated=%d took=%s",
		mode, len(pool), count, len(questions), s.now().Sub(start))

	return Questions{Items: questions, Meta: s.meta(mode, len(questions))}, nil
}

func (s *Service) meta(mode Mode, count int) Meta {
	return Meta{Mode: mode, Count: count, GeneratedAt: s.now().UTC()}
}

// buildPool gathers a deduplicated movie catalog and enriches it with the
// metric required by the mode, dropping titles missing that metric.
func (s *Service) buildPool(ctx context.Context, mode Mode) ([]candidate, error) {
	suggestions := s.gatherSuggestions(ctx)
	if len(suggestions) > poolSize {
		suggestions = suggestions[:poolSize]
	}

	enriched := s.enrichPool(ctx, suggestions)

	pool := make([]candidate, 0, len(enriched))
	switch mode {
	case ModeReleaseDate:
		for _, c := range enriched {
			if c.hasDate {
				pool = append(pool, c)
			}
		}
	case ModeRating:
		for _, c := range enriched {
			if c.card.Rating > 0 {
				pool = append(pool, c)
			}
		}
	default:
		return nil, fmt.Errorf("unsupported mode: %s", mode)
	}
	return pool, nil
}

// gatherSuggestions pulls popular, top-rated and trending movies and dedups
// them by tmdbId, preserving discovery order.
func (s *Service) gatherSuggestions(ctx context.Context) []release.Suggestion {
	lists := make([][]release.Suggestion, 0, 3)
	if popular, err := s.catalog.Popular(ctx, "movie", perListFetch); err == nil {
		lists = append(lists, popular)
	} else {
		s.logf("games popular fetch failed: %v", err)
	}
	if topRated, err := s.catalog.TopRated(ctx, "movie", perListFetch); err == nil {
		lists = append(lists, topRated)
	} else {
		s.logf("games top-rated fetch failed: %v", err)
	}
	if trending, err := s.catalog.TrendingByType(ctx, "movie", "week", perListFetch); err == nil {
		lists = append(lists, trending)
	} else {
		s.logf("games trending fetch failed: %v", err)
	}

	seen := make(map[int]bool)
	out := make([]release.Suggestion, 0, poolSize)
	// Interleave lists so the pool blends popularity and rating diversity.
	for i := 0; ; i++ {
		added := false
		for _, list := range lists {
			if i >= len(list) {
				continue
			}
			added = true
			item := list[i]
			if item.ID <= 0 || seen[item.ID] {
				continue
			}
			seen[item.ID] = true
			out = append(out, item)
		}
		if !added {
			break
		}
	}
	return out
}

// enrichPool fetches TMDB details for each suggestion via bounded concurrency,
// filling the comparison metrics (release date and rating) used by every mode.
// Titles whose details fail to load are dropped.
func (s *Service) enrichPool(ctx context.Context, suggestions []release.Suggestion) []candidate {
	type result struct {
		candidate candidate
		ok        bool
	}
	results := make([]result, len(suggestions))
	sem := make(chan struct{}, maxConcurrency)
	var wg sync.WaitGroup
	for i, item := range suggestions {
		wg.Add(1)
		go func(i int, item release.Suggestion) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			details, err := s.catalog.Details(ctx, item.ID, "movie")
			if err != nil {
				return
			}
			card := TitleCard{
				TMDBID:      item.ID,
				MediaType:   "movie",
				Title:       item.Title,
				Year:        item.Year,
				PosterURL:   item.PosterURL,
				ReleaseDate: details.ReleaseDate,
				Rating:      details.VoteAverage,
			}
			cand := candidate{card: card}
			if parsed, err := time.Parse("2006-01-02", strings.TrimSpace(details.ReleaseDate)); err == nil {
				cand.releaseDate = parsed
				cand.hasDate = true
			}
			results[i] = result{candidate: cand, ok: true}
		}(i, item)
	}
	wg.Wait()

	pool := make([]candidate, 0, len(suggestions))
	for _, res := range results {
		if res.ok {
			pool = append(pool, res.candidate)
		}
	}
	return pool
}

// buildQuestions greedily forms valid, varied pairs from the pool. A first pass
// caps each title to two appearances; a second pass relaxes that cap if the
// pool is too small to reach the requested count.
func (s *Service) buildQuestions(mode Mode, pool []candidate, count int) []Question {
	questions := make([]Question, 0, count)
	if len(pool) < 2 {
		return questions
	}

	usage := make(map[int]int)
	usedPairs := make(map[string]bool)

	fill := func(capUsage bool) {
		attempts := 0
		limit := count * maxPairAttempts
		for len(questions) < count && attempts < limit {
			attempts++
			i := s.intn(len(pool))
			j := s.intn(len(pool))
			if i == j {
				continue
			}
			a, b := pool[i], pool[j]
			pairKey := pairKey(a.card.TMDBID, b.card.TMDBID)
			if usedPairs[pairKey] {
				continue
			}
			if capUsage && (usage[a.card.TMDBID] >= 2 || usage[b.card.TMDBID] >= 2) {
				continue
			}
			question, ok := makeQuestion(mode, a, b, len(questions))
			if !ok {
				continue
			}
			questions = append(questions, question)
			usedPairs[pairKey] = true
			usage[a.card.TMDBID]++
			usage[b.card.TMDBID]++
		}
	}

	fill(true)
	if len(questions) < count {
		fill(false)
	}
	return questions
}

// makeQuestion validates a pair for the mode and builds the question with the
// correct answer side. ok=false means the pair is ambiguous or ineligible.
func makeQuestion(mode Mode, a, b candidate, index int) (Question, bool) {
	answer, ok := evaluate(mode, a, b)
	if !ok {
		return Question{}, false
	}
	return Question{
		ID:     fmt.Sprintf("q_%02d", index+1),
		Mode:   mode,
		Prompt: prompts[mode],
		Left:   a.card,
		Right:  b.card,
		Answer: answer,
	}, true
}

// evaluate returns the correct side ("left"/"right") for a pair, or ok=false
// when the pair fails the mode's validity threshold.
func evaluate(mode Mode, a, b candidate) (string, bool) {
	switch mode {
	case ModeReleaseDate:
		if !a.hasDate || !b.hasDate || a.releaseDate.Equal(b.releaseDate) {
			return "", false
		}
		if a.releaseDate.Before(b.releaseDate) {
			return "left", true
		}
		return "right", true
	case ModeRating:
		diff := a.card.Rating - b.card.Rating
		if diff < 0 {
			diff = -diff
		}
		if diff < ratingMinGap {
			return "", false
		}
		if a.card.Rating > b.card.Rating {
			return "left", true
		}
		return "right", true
	default:
		return "", false
	}
}

func pairKey(a, b int) string {
	if a > b {
		a, b = b, a
	}
	return fmt.Sprintf("%d-%d", a, b)
}

func (s *Service) intn(n int) int {
	s.rngMu.Lock()
	defer s.rngMu.Unlock()
	return s.rng.Intn(n)
}

func (s *Service) logf(format string, args ...any) {
	if s.logger != nil {
		s.logger.Printf(format, args...)
	}
}
