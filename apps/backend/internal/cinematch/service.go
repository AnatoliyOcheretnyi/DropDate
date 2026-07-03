package cinematch

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math/rand"
	"strconv"
	"sync"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
)

const (
	defaultCount = 6
	maxCount     = 12
)

// ErrInvalidRequest marks a client error (unknown answer) -> HTTP 400.
var ErrInvalidRequest = errors.New("invalid match request")

// Service runs the iterative mixed-media (movie + tv) narrowing picker.
type Service struct {
	catalog catalogSource
	saved   savedReader
	logger  *log.Logger
	now     func() time.Time
	rng     *rand.Rand
	rngMu   sync.Mutex
}

func NewService(catalog catalogSource, savedSvc savedReader, logger *log.Logger) *Service {
	if logger == nil {
		logger = log.Default()
	}
	return &Service{
		catalog: catalog,
		saved:   savedSvc,
		logger:  logger,
		now:     time.Now,
		rng:     rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// Questions returns the fixed, ordered narrowing flow. The client asks the
// media question first, then filters the rest by AppliesTo.
func (s *Service) Questions() QuestionSet {
	items := make([]Question, len(questionFlow))
	copy(items, questionFlow)

	var set QuestionSet
	set.Items = items
	set.Meta.Version = schemaVersion
	return set
}

func NormalizeCount(count int) int {
	if count <= 0 {
		return defaultCount
	}
	if count > maxCount {
		return maxCount
	}
	return count
}

// Picks resolves the accumulated answers into a mixed batch of movie + tv picks,
// excluding everything already shown.
func (s *Service) Picks(ctx context.Context, req PicksRequest) (PicksResult, error) {
	if err := validateAnswers(req.Answers); err != nil {
		return PicksResult{}, err
	}
	count := NormalizeCount(req.Count)

	var result PicksResult
	result.Items = []Pick{}
	result.Meta.GeneratedAt = s.now().UTC()
	if s.catalog == nil {
		return result, nil
	}

	excluded := s.excludedKeys(ctx, req)
	params := resolveParams(req.Answers)

	pool := s.collect(ctx, []release.DiscoverParams{params}, excluded)
	if len(pool) == 0 {
		// Fallback: drop filters but keep the chosen media + a low quality floor.
		pool = s.collect(ctx, []release.DiscoverParams{
			{MediaType: params.MediaType, SortBy: "popularity.desc", VoteCountGTE: 100},
		}, excluded)
	}

	s.shuffle(pool)
	if len(pool) > count {
		pool = pool[:count]
	}

	reason := reasonFor(req.Answers)
	for _, item := range pool {
		result.Items = append(result.Items, Pick{
			TMDBID:    item.TMDBID,
			MediaType: item.MediaType,
			Title:     item.Title,
			Year:      item.Year,
			PosterURL: item.PosterURL,
			Rating:    item.Rating,
			Reason:    reason,
		})
	}
	result.Meta.Count = len(result.Items)
	s.logf("match picks answers=%v final=%d", req.Answers, len(result.Items))
	return result, nil
}

// collect queries each param set, merging unique, non-excluded items.
func (s *Service) collect(
	ctx context.Context,
	paramSets []release.DiscoverParams,
	excluded map[string]bool,
) []release.DiscoverItem {
	seen := make(map[string]bool)
	pool := make([]release.DiscoverItem, 0, 24)
	for _, params := range paramSets {
		items, err := s.catalog.Discover(ctx, params)
		if err != nil {
			s.logf("match discover failed mediaType=%s: %v", params.MediaType, err)
			continue
		}
		for _, item := range items {
			if item.TMDBID <= 0 {
				continue
			}
			key := itemKey(item.MediaType, item.TMDBID)
			if seen[key] || excluded[key] {
				continue
			}
			seen[key] = true
			pool = append(pool, item)
		}
	}
	return pool
}

func (s *Service) excludedKeys(ctx context.Context, req PicksRequest) map[string]bool {
	excluded := make(map[string]bool)
	for _, key := range req.ExcludeKeys {
		if key != "" {
			excluded[key] = true
		}
	}
	if s.saved == nil || req.UserID == "" {
		return excluded
	}
	rows, err := s.saved.SeedRows(ctx, req.UserID)
	if err != nil {
		s.logf("match saved exclusion lookup failed user=%s: %v", req.UserID, err)
		return excluded
	}
	for _, row := range rows {
		if row.TMDBID > 0 {
			excluded[itemKey(row.MediaType, row.TMDBID)] = true
		}
	}
	return excluded
}

func (s *Service) shuffle(items []release.DiscoverItem) {
	s.rngMu.Lock()
	defer s.rngMu.Unlock()
	s.rng.Shuffle(len(items), func(i, j int) {
		items[i], items[j] = items[j], items[i]
	})
}

func itemKey(mediaType string, tmdbID int) string {
	return mediaType + ":" + strconv.Itoa(tmdbID)
}

// validateAnswers rejects unknown answers; missing answers are allowed (optional).
func validateAnswers(answers map[string]string) error {
	for questionID, optionID := range answers {
		if optionID == "" {
			continue
		}
		if !validOption(questionID, optionID) {
			return fmt.Errorf("%w: invalid answer %q for %q", ErrInvalidRequest, optionID, questionID)
		}
	}
	return nil
}

func (s *Service) logf(format string, args ...any) {
	if s.logger != nil {
		s.logger.Printf(format, args...)
	}
}
