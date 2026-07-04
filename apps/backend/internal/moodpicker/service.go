package moodpicker

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math/rand"
	"sync"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
)

const (
	defaultCount     = 6
	maxCount         = 12
	pagesPerAttempt  = 2
	relaxedVoteCount = 50
)

// ErrInvalidRequest marks a client error (bad mode/depth/answers) -> HTTP 400.
var ErrInvalidRequest = errors.New("invalid mood request")

// Service turns guided answers into TMDB-backed movie picks.
type Service struct {
	catalog catalogSource
	saved   savedReader
	logger  *log.Logger
	now     func() time.Time
	rng     *rand.Rand
	rngMu   sync.Mutex
	aiNext  NextQuestionStrategy
}

// NewService wires the mood picker to its catalog and (optional) saved source.
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

// Questions returns the question schema for a depth.
func (s *Service) Questions(depth string) QuestionSet {
	return QuestionsForDepth(depth)
}

// SetNextQuestionStrategy installs the AI strategy for adaptive branching. When
// nil (or when a request doesn't opt in), the deterministic rule-based order is
// used.
func (s *Service) SetNextQuestionStrategy(strategy NextQuestionStrategy) {
	s.aiNext = strategy
}

// NextStep returns the next question to ask given the answers so far, or Done.
// When useAI is true and a strategy is installed, the AI picks the next question
// from the eligible set (grounded); otherwise the rule-based order applies.
func (s *Service) NextStep(ctx context.Context, depth string, answers map[string]string, useAI bool) (NextResult, error) {
	depth = NormalizeDepth(depth)
	if answers == nil {
		answers = map[string]string{}
	}
	if err := validateDynamicAnswers(answers); err != nil {
		return NextResult{}, err
	}
	meta := QuestionMeta{Depth: depth, Version: schemaVersion}

	// Mood is always asked first for coherence; AI never overrides that.
	if _, ok := answers["mood"]; !ok {
		q := questions["mood"]
		return NextResult{Question: &q, Answered: len(answers), Meta: meta}, nil
	}

	eligible := eligibleNextIDs(depth, answers)
	if len(eligible) == 0 {
		return NextResult{Done: true, Answered: len(answers), Meta: meta}, nil
	}

	chosen := eligible[0] // rule-based default
	if useAI && s.aiNext != nil && len(eligible) > 1 {
		if id := s.aiPickNext(ctx, answers, eligible); id != "" {
			chosen = id
		}
	}
	q := questions[chosen]
	return NextResult{Question: &q, Answered: len(answers), Meta: meta}, nil
}

// aiPickNext asks the AI strategy for the next question id, returning "" on any
// failure or an out-of-set answer so the caller falls back to rules.
func (s *Service) aiPickNext(ctx context.Context, answers map[string]string, eligible []string) string {
	allowed := make(map[string]bool, len(eligible))
	candidates := make([]Question, 0, len(eligible))
	for _, id := range eligible {
		allowed[id] = true
		candidates = append(candidates, questions[id])
	}
	id, err := s.aiNext.NextQuestionID(ctx, answeredContext(answers), candidates)
	if err != nil {
		s.logf("mood ai next-question failed: %v", err)
		return ""
	}
	if !allowed[id] {
		return ""
	}
	return id
}

// answeredContext builds a stable, labelled view of the answers for the AI.
func answeredContext(answers map[string]string) []AnsweredQuestion {
	order := []string{"mood", "scary_type", "think_type", "pace", "cry_type", "region", "time", "era", "company", "discovery"}
	out := make([]AnsweredQuestion, 0, len(answers))
	seen := make(map[string]bool)
	add := func(id string) {
		opt, ok := answers[id]
		if !ok || seen[id] {
			return
		}
		q, exists := questions[id]
		if !exists {
			return
		}
		seen[id] = true
		out = append(out, AnsweredQuestion{
			QuestionID:    id,
			QuestionTitle: q.Title,
			OptionID:      opt,
			OptionLabel:   optionLabel(id, opt),
		})
	}
	for _, id := range order {
		add(id)
	}
	for id := range answers {
		add(id)
	}
	return out
}

// NormalizeCount clamps a requested pick count into the supported range.
func NormalizeCount(count int) int {
	if count <= 0 {
		return defaultCount
	}
	if count > maxCount {
		return maxCount
	}
	return count
}

// Picks resolves answers to a ranked, shuffled set of movie picks.
func (s *Service) Picks(ctx context.Context, req PicksRequest) (PicksResult, error) {
	if mode := req.Mode; mode != "" && mode != "guided" {
		return PicksResult{}, fmt.Errorf("%w: mode %q not supported", ErrInvalidRequest, mode)
	}
	depth := NormalizeDepth(req.Depth)
	if err := validateDynamicAnswers(req.Answers); err != nil {
		return PicksResult{}, err
	}
	if req.Answers["mood"] == "" {
		return PicksResult{}, fmt.Errorf("%w: missing answer for %q", ErrInvalidRequest, "mood")
	}

	count := NormalizeCount(req.Count)
	if s.catalog == nil {
		return PicksResult{Items: []Pick{}, Meta: PicksMeta{Count: 0, Relaxed: []string{}, GeneratedAt: s.now().UTC()}}, nil
	}

	excluded := s.excludedIDs(ctx, req)
	pool, relaxed, err := s.gather(ctx, resolveParams(req.Answers), count, excluded)
	if err != nil {
		return PicksResult{}, err
	}

	s.shuffle(pool)
	if len(pool) > count {
		pool = pool[:count]
	}

	reason := reasonFor(req.Answers)
	items := make([]Pick, 0, len(pool))
	for _, item := range pool {
		items = append(items, Pick{
			TMDBID:    item.TMDBID,
			MediaType: "movie",
			Title:     item.Title,
			Year:      item.Year,
			PosterURL: item.PosterURL,
			Rating:    item.Rating,
			Reason:    reason,
		})
	}

	s.logf("mood picks depth=%s answers=%v final=%d relaxed=%v", depth, req.Answers, len(items), relaxed)
	return PicksResult{
		Items: items,
		Meta: PicksMeta{
			Count:       len(items),
			Relaxed:     relaxed,
			GeneratedAt: s.now().UTC(),
		},
	}, nil
}

// gather fetches discover results, progressively relaxing constraints until it
// has at least `needed` distinct, non-excluded picks or runs out of relaxations.
func (s *Service) gather(
	ctx context.Context,
	params release.DiscoverParams,
	needed int,
	excluded map[int]bool,
) ([]release.DiscoverItem, []string, error) {
	seen := make(map[int]bool)
	pool := make([]release.DiscoverItem, 0, needed*2)
	relaxed := []string{}

	collect := func(p release.DiscoverParams) error {
		for page := 1; page <= pagesPerAttempt; page++ {
			p.Page = page
			items, err := s.catalog.Discover(ctx, p)
			if err != nil {
				return err
			}
			for _, item := range items {
				if item.TMDBID <= 0 || seen[item.TMDBID] || excluded[item.TMDBID] {
					continue
				}
				seen[item.TMDBID] = true
				pool = append(pool, item)
			}
			if len(items) == 0 {
				break
			}
		}
		return nil
	}

	if err := collect(params); err != nil {
		return nil, nil, err
	}

	for _, step := range relaxers {
		if len(pool) >= needed {
			break
		}
		if !step.apply(&params) {
			continue
		}
		relaxed = append(relaxed, step.name)
		// A relaxation error after a successful first fetch should not fail the
		// whole request -- return what we have.
		if err := collect(params); err != nil {
			s.logf("mood relax %q discover failed: %v", step.name, err)
			break
		}
	}

	return pool, relaxed, nil
}

// relaxers is the ordered relaxation ladder. Each step mutates the params and
// reports whether it changed anything.
var relaxers = []struct {
	name  string
	apply func(*release.DiscoverParams) bool
}{
	{"runtime", func(p *release.DiscoverParams) bool {
		if p.RuntimeLTE == 0 && p.RuntimeGTE == 0 {
			return false
		}
		p.RuntimeLTE, p.RuntimeGTE = 0, 0
		return true
	}},
	{"era", func(p *release.DiscoverParams) bool {
		if p.ReleaseDateGTE == "" && p.ReleaseDateLTE == "" {
			return false
		}
		p.ReleaseDateGTE, p.ReleaseDateLTE = "", ""
		return true
	}},
	{"vote_count", func(p *release.DiscoverParams) bool {
		if p.VoteCountGTE <= relaxedVoteCount {
			return false
		}
		p.VoteCountGTE = relaxedVoteCount
		return true
	}},
	{"genres_excluded", func(p *release.DiscoverParams) bool {
		if len(p.WithoutGenres) == 0 {
			return false
		}
		p.WithoutGenres = nil
		return true
	}},
	{"genres", func(p *release.DiscoverParams) bool {
		if len(p.WithGenres) == 0 {
			return false
		}
		p.WithGenres = nil
		return true
	}},
}

// excludedIDs builds the set of TMDB ids to skip: client-supplied + saved.
func (s *Service) excludedIDs(ctx context.Context, req PicksRequest) map[int]bool {
	excluded := make(map[int]bool)
	for _, id := range req.ExcludeTMDBIDs {
		if id > 0 {
			excluded[id] = true
		}
	}
	if s.saved == nil || req.UserID == "" {
		return excluded
	}
	rows, err := s.saved.SeedRows(ctx, req.UserID)
	if err != nil {
		s.logf("mood saved exclusion lookup failed user=%s: %v", req.UserID, err)
		return excluded
	}
	for _, row := range rows {
		if row.TMDBID > 0 {
			excluded[row.TMDBID] = true
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

// validateDynamicAnswers ensures every provided answer is a known option. The
// answered set is dynamic (adaptive flow), so only validity is checked here;
// callers additionally require the essential answers (e.g. mood).
func validateDynamicAnswers(answers map[string]string) error {
	for qid, opt := range answers {
		if opt == "" || !validOption(qid, opt) {
			return fmt.Errorf("%w: invalid answer %q for %q", ErrInvalidRequest, opt, qid)
		}
	}
	return nil
}

func (s *Service) logf(format string, args ...any) {
	if s.logger != nil {
		s.logger.Printf(format, args...)
	}
}
