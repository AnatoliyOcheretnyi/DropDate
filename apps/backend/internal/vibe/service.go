package vibe

import (
	"context"
	"log"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/themes"
)

// Vocabulary is everything the model is allowed to choose from. It is built
// here and passed to the interpreter, so the model and the validator always
// read the same lists.
type Vocabulary struct {
	Themes    []themes.Theme `json:"themes"`
	Genres    []Genre        `json:"genres"`
	Countries []Country      `json:"countries"`
}

// Interpreter turns a phrase into a plan. Implemented by internal/airecs
// (Gemini); a nil interpreter simply means the keyword matcher does the work.
type Interpreter interface {
	InterpretPhrase(ctx context.Context, phrase string, vocab Vocabulary) (Plan, error)
}

// Candidate is one title offered to the reranker, with enough of its content
// for the model to judge fit: a name alone cannot tell "жах для підлітків"
// from "жах про підлітків".
type Candidate struct {
	TMDBID    int      `json:"tmdbId"`
	MediaType string   `json:"mediaType"`
	Title     string   `json:"title"`
	Year      string   `json:"year,omitempty"`
	Overview  string   `json:"overview,omitempty"`
	Genres    []string `json:"genres,omitempty"`
	Themes    []string `json:"themes,omitempty"`
}

// Reranker orders candidates by how well they answer the phrase. It returns
// the candidate keys ("movie:1234") in the new order; unknown keys are ignored.
type Reranker interface {
	RerankByPhrase(ctx context.Context, phrase string, pool []Candidate, limit int) ([]string, error)
}

// Discoverer runs one /discover leg.
type Discoverer interface {
	Discover(ctx context.Context, params release.DiscoverParams) ([]release.DiscoverItem, error)
}

// Results is one page of an associative search.
type Results struct {
	Items    []release.Suggestion `json:"results"`
	Page     int                  `json:"page"`
	HasMore  bool                 `json:"hasMore"`
	Reranked bool                 `json:"reranked"`
	// Broadened records that the strict reading of the phrase was too thin to
	// fill a page, so the themes were OR-ed instead of AND-ed. The client says
	// so rather than passing off near misses as exact answers.
	Broadened bool `json:"broadened"`
}

// Service is the associative search engine.
type Service struct {
	discover Discoverer
	ai       Interpreter
	reranker Reranker
	cache    *planCache
	logger   *log.Logger
	now      func() time.Time
}

// Options configure the service. Everything except the discoverer is optional:
// without an interpreter the engine falls back to the keyword matcher, without
// a reranker it keeps TMDB's popularity order.
type Options struct {
	Interpreter Interpreter
	Reranker    Reranker
	Logger      *log.Logger
	Now         func() time.Time
}

// NewService builds the engine. A nil discoverer yields a service that always
// returns empty results rather than failing at call time.
func NewService(discover Discoverer, opts Options) *Service {
	logger := opts.Logger
	if logger == nil {
		logger = log.Default()
	}
	now := opts.Now
	if now == nil {
		now = time.Now
	}
	return &Service{
		discover: discover,
		ai:       opts.Interpreter,
		reranker: opts.Reranker,
		cache:    newPlanCache(planCacheSize, planCacheTTL),
		logger:   logger,
		now:      now,
	}
}

// MaxPhraseLength caps what we send to the model. Anything longer is a paste,
// not a phrase.
const MaxPhraseLength = 240

// Interpret turns a phrase into a plan, preferring the model and falling back
// to the keyword matcher whenever the model is off, fails, or returns nothing
// usable. It never returns an error: a poor plan is still a plan, and an empty
// one is a legitimate answer the caller renders as "не зрозуміли".
func (s *Service) Interpret(ctx context.Context, phrase string, useAI bool) Plan {
	phrase = NormalizePhrase(phrase)
	if phrase == "" {
		return Plan{}
	}

	if cached, ok := s.cache.get(phrase, useAI); ok {
		return cached
	}

	// Normalized even while empty, so the "не зрозуміли" answer carries the same
	// shape as every other one: empty lists rather than nulls.
	plan := Plan{}.Normalize(s.now())
	if useAI && s.ai != nil {
		// A phrase is typed into a live search box: a model that needs longer
		// than this is worse than the keyword matcher that answers instantly.
		aiCtx, cancel := context.WithTimeout(ctx, interpretTimeout)
		aiPlan, err := s.ai.InterpretPhrase(aiCtx, phrase, s.Vocabulary())
		cancel()
		if err != nil {
			s.logger.Printf("vibe: ai interpretation failed: %v", err)
		} else {
			aiPlan.Source = SourceAI
			aiPlan.Phrase = phrase
			plan = aiPlan.Normalize(s.now())
		}
	}

	if plan.IsEmpty() {
		// The matcher understands plain words, which is most of what people
		// type; it just cannot read between them.
		fallback := matchPlan(phrase)
		fallback.Phrase = phrase
		fallback = fallback.Normalize(s.now())
		fallback.Source = SourceKeywords
		if !fallback.IsEmpty() {
			plan = fallback
		}
	}

	s.cache.set(phrase, useAI, plan)
	return plan
}

// Normalize validates a plan that came from the client against the same
// vocabulary the model is held to.
func (s *Service) Normalize(plan Plan) Plan {
	normalized := plan.Normalize(s.now())
	if normalized.Source == "" {
		normalized.Source = SourceManual
	}
	return normalized
}

// Vocabulary returns the lists the model may pick from.
func (s *Service) Vocabulary() Vocabulary {
	return Vocabulary{Themes: themes.All(), Genres: Genres(), Countries: Countries()}
}

// Results runs the plan against TMDB. Movies and series are fetched as separate
// legs (their genre ids differ) and interleaved, the same way discovery does it.
//
// A multi-theme plan is asked twice: once strictly, then — only if strict came
// back too thin to fill a page — once broadly. TMDB's keyword tagging is sparse
// enough that "молодіжний жах де багато крові" read strictly finds two titles,
// and a page of two titles is a worse answer than a page of near misses the
// reranker can order.
func (s *Service) Results(ctx context.Context, plan Plan, page int) (Results, error) {
	if page < 1 {
		page = 1
	}
	out := Results{Page: page, Items: []release.Suggestion{}}
	if s.discover == nil || plan.IsEmpty() {
		return out, nil
	}

	match := MatchStrict
	if !plan.narrows() {
		// One theme reads the same either way; skip the second round trip.
		match = MatchBroad
	}
	movies, series, err := s.legs(ctx, plan, match, page)
	if err != nil {
		return Results{}, err
	}
	if match == MatchStrict && len(movies)+len(series) < broadenBelow {
		broadMovies, broadSeries, broadErr := s.legs(ctx, plan, MatchBroad, page)
		if broadErr != nil {
			return Results{}, broadErr
		}
		if len(broadMovies)+len(broadSeries) > len(movies)+len(series) {
			movies, series = broadMovies, broadSeries
			out.Broadened = true
		}
	}

	mixed := interleave(movies, series)
	out.HasMore = len(movies) >= discoverPageSize || len(series) >= discoverPageSize

	// Reranking only makes sense on the first page: later pages are the tail of
	// a popularity order the model has already been asked about once.
	if page == 1 && s.reranker != nil && len(mixed) > 1 {
		if ordered, ok := s.rerank(ctx, plan, mixed); ok {
			mixed = ordered
			out.Reranked = true
		}
	}

	out.Items = toSuggestions(mixed)
	return out, nil
}

// legs runs the movie and series halves of one reading of the plan.
func (s *Service) legs(
	ctx context.Context,
	plan Plan,
	match Match,
	page int,
) (movies, series []release.DiscoverItem, err error) {
	if params, ok := plan.DiscoverParams(MediaMovie, match); ok {
		params.Page = page
		movies, err = s.discover.Discover(ctx, params)
		if err != nil {
			return nil, nil, err
		}
	}
	if params, ok := plan.DiscoverParams(MediaTV, match); ok {
		params.Page = page
		series, err = s.discover.Discover(ctx, params)
		if err != nil {
			return nil, nil, err
		}
	}
	return movies, series, nil
}

func (s *Service) rerank(
	ctx context.Context,
	plan Plan,
	items []release.DiscoverItem,
) ([]release.DiscoverItem, bool) {
	phrase := strings.TrimSpace(plan.Phrase)
	if phrase == "" {
		phrase = strings.TrimSpace(plan.Summary)
	}
	if phrase == "" {
		return nil, false
	}
	pool := make([]Candidate, 0, len(items))
	index := make(map[string]release.DiscoverItem, len(items))
	for _, item := range items {
		key := candidateKey(item.MediaType, item.TMDBID)
		index[key] = item
		pool = append(pool, Candidate{
			TMDBID:    item.TMDBID,
			MediaType: item.MediaType,
			Title:     item.Title,
			Year:      item.Year,
			Overview:  trimOverview(item.Overview),
			Themes:    themeLabels(plan.Themes),
		})
	}

	rerankCtx, cancel := context.WithTimeout(ctx, rerankTimeout)
	defer cancel()
	ordered, err := s.reranker.RerankByPhrase(rerankCtx, phrase, pool, len(pool))
	if err != nil {
		s.logger.Printf("vibe: rerank failed: %v", err)
		return nil, false
	}
	if len(ordered) == 0 {
		return nil, false
	}

	out := make([]release.DiscoverItem, 0, len(items))
	used := make(map[string]bool, len(ordered))
	for _, key := range ordered {
		item, ok := index[key]
		if !ok || used[key] {
			continue
		}
		used[key] = true
		out = append(out, item)
	}
	// Whatever the model left out keeps its original order at the end: dropping
	// titles it simply did not mention would shrink the page for no reason.
	for _, item := range items {
		key := candidateKey(item.MediaType, item.TMDBID)
		if !used[key] {
			out = append(out, item)
		}
	}
	return out, true
}

func themeLabels(ids []string) []string {
	labels := make([]string, 0, len(ids))
	for _, theme := range themes.Pick(ids...) {
		labels = append(labels, theme.Label)
	}
	return labels
}

// SourceManual marks a plan the user edited by hand.
const SourceManual = "manual"

const (
	discoverPageSize = 20
	// broadenBelow is how few strict matches count as "not a page". Half a
	// screen of exact answers is still an answer; a handful is not.
	broadenBelow = 10
	// Two or three sentences say what a film is about; the rest is plot recap
	// that only makes the rerank prompt slower.
	maxOverviewRunes = 220

	interpretTimeout = 6 * time.Second
	rerankTimeout    = 7 * time.Second
)

func trimOverview(value string) string {
	value = strings.TrimSpace(value)
	runes := []rune(value)
	if len(runes) <= maxOverviewRunes {
		return value
	}
	return string(runes[:maxOverviewRunes]) + "…"
}

// CandidateKey is how a title is addressed in the rerank round trip.
func CandidateKey(mediaType string, tmdbID int) string {
	return candidateKey(mediaType, tmdbID)
}

func candidateKey(mediaType string, tmdbID int) string {
	return mediaType + ":" + strconv.Itoa(tmdbID)
}

func interleave(movies, series []release.DiscoverItem) []release.DiscoverItem {
	longest := len(movies)
	if len(series) > longest {
		longest = len(series)
	}
	out := make([]release.DiscoverItem, 0, len(movies)+len(series))
	for i := 0; i < longest; i++ {
		if i < len(movies) {
			out = append(out, movies[i])
		}
		if i < len(series) {
			out = append(out, series[i])
		}
	}
	return out
}

func toSuggestions(items []release.DiscoverItem) []release.Suggestion {
	out := make([]release.Suggestion, 0, len(items))
	for _, item := range items {
		out = append(out, release.Suggestion{
			ID:        item.TMDBID,
			Title:     item.Title,
			MediaType: item.MediaType,
			Year:      item.Year,
			PosterURL: item.PosterURL,
		})
	}
	return out
}

// NormalizePhrase is the cache key and the model input: trimmed, single-spaced,
// length-capped. Case is kept — the model reads it, not a map.
func NormalizePhrase(phrase string) string {
	phrase = strings.Join(strings.Fields(phrase), " ")
	runes := []rune(phrase)
	if len(runes) > MaxPhraseLength {
		phrase = string(runes[:MaxPhraseLength])
	}
	return phrase
}

// ── plan cache ──────────────────────────────────────────────────────────────

const (
	planCacheSize = 512
	planCacheTTL  = 24 * time.Hour
)

// planCache keeps interpretations of repeated phrases. "про любов" is typed by
// a thousand people and means the same thing every time, so it is worth exactly
// one model call a day.
type planCache struct {
	mu      sync.Mutex
	entries map[string]planCacheEntry
	order   []string
	size    int
	ttl     time.Duration
}

type planCacheEntry struct {
	plan      Plan
	expiresAt time.Time
}

func newPlanCache(size int, ttl time.Duration) *planCache {
	return &planCache{entries: make(map[string]planCacheEntry, size), size: size, ttl: ttl}
}

func (c *planCache) key(phrase string, useAI bool) string {
	if useAI {
		return "ai:" + strings.ToLower(phrase)
	}
	return "kw:" + strings.ToLower(phrase)
}

func (c *planCache) get(phrase string, useAI bool) (Plan, bool) {
	key := c.key(phrase, useAI)
	c.mu.Lock()
	defer c.mu.Unlock()
	entry, ok := c.entries[key]
	if !ok {
		return Plan{}, false
	}
	if time.Now().After(entry.expiresAt) {
		delete(c.entries, key)
		return Plan{}, false
	}
	return entry.plan, true
}

func (c *planCache) set(phrase string, useAI bool, plan Plan) {
	key := c.key(phrase, useAI)
	c.mu.Lock()
	defer c.mu.Unlock()
	if _, exists := c.entries[key]; !exists {
		c.order = append(c.order, key)
		for len(c.order) > c.size {
			oldest := c.order[0]
			c.order = c.order[1:]
			delete(c.entries, oldest)
		}
	}
	c.entries[key] = planCacheEntry{plan: plan, expiresAt: time.Now().Add(c.ttl)}
}
