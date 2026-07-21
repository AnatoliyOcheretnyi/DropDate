package games

import (
	"context"
	"fmt"
	"hash/fnv"
	"log"
	"math/rand"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
)

const (
	defaultCount = 5
	maxCount     = 20

	// poolSize caps how many distinct titles we enrich/consider per request.
	poolSize        = 48
	perListFetch    = 20
	maxConcurrency  = 6
	ratingMinGap    = 0.4
	maxPairAttempts = 200
)

var prompts = map[Mode]string{
	ModeReleaseDate:   "Який фільм вийшов раніше?",
	ModeRating:        "У якого фільму вищий рейтинг TMDB?",
	ModePoster:        "Що це за фільм?",
	ModeTimeline:      "Розстав фільми від найстарішого до найновішого",
	ModeYear:          "Якого року вийшов цей фільм?",
	ModeMovieDirector: "Хто режисер цього фільму?",
	ModeDirectorMovie: "Який фільм зняв цей режисер?",
	ModeMovieActor:    "Хто з цих акторів грав у фільмі?",
	ModeActorMovie:    "У якому фільмі грав цей актор?",
}

const (
	posterOptionCount = 4
	timelineItemCount = 4
)

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

// SupportedMode reports whether a mode string maps to a known game mode.
func SupportedMode(value string) (Mode, bool) {
	switch mode := Mode(strings.TrimSpace(strings.ToLower(value))); mode {
	case ModeReleaseDate, ModeRating, ModePoster, ModeTimeline, ModeYear, ModeMovieDirector, ModeDirectorMovie, ModeMovieActor, ModeActorMovie:
		return mode, true
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

// Generate builds a set of questions for the requested mode. Movie scope only.
func (s *Service) Generate(ctx context.Context, mode Mode, count int) (Questions, error) {
	return s.generate(ctx, mode, count, s.intn)
}

// GenerateSeeded builds a deterministic question set for the given seed —
// used by the daily challenge so every player gets the same rounds.
func (s *Service) GenerateSeeded(ctx context.Context, mode Mode, count int, seed int64) (Questions, error) {
	rng := rand.New(rand.NewSource(seed))
	return s.generate(ctx, mode, count, rng.Intn)
}

// DailySeed derives a deterministic RNG seed from a mode and a calendar day.
func DailySeed(mode Mode, day time.Time) int64 {
	h := fnv.New64a()
	h.Write([]byte(day.Format("2006-01-02")))
	h.Write([]byte(mode))
	return int64(h.Sum64())
}

func (s *Service) generate(ctx context.Context, mode Mode, count int, intn func(int) int) (Questions, error) {
	count = NormalizeCount(count)
	start := s.now()

	if s.catalog == nil {
		return Questions{Items: []Question{}, Meta: s.meta(mode, 0)}, nil
	}

	pool, err := s.buildPool(ctx, mode)
	if err != nil {
		return Questions{}, err
	}

	var questions []Question
	switch mode {
	case ModePoster:
		questions = buildPosterQuestions(pool, count, intn)
	case ModeTimeline:
		questions = buildTimelineQuestions(pool, count, intn)
	case ModeYear:
		questions = buildYearQuestions(pool, count, intn)
	case ModeMovieDirector, ModeDirectorMovie, ModeMovieActor, ModeActorMovie:
		questions = buildPeopleQuestions(mode, pool, count, intn)
	default:
		questions = buildPairQuestions(mode, pool, count, intn)
	}
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
	case ModeReleaseDate, ModeTimeline, ModeYear:
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
	case ModePoster:
		for _, c := range enriched {
			if c.card.Title != "" && (c.card.BackdropURL != "" || c.card.PosterURL != "") {
				pool = append(pool, c)
			}
		}
	case ModeMovieDirector, ModeDirectorMovie:
		for _, c := range enriched {
			if len(c.directors) > 0 {
				pool = append(pool, c)
			}
		}
	case ModeMovieActor, ModeActorMovie:
		for _, c := range enriched {
			if len(c.cast) > 0 {
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
	lists := make([][]release.Suggestion, 0, 4)
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
	if trending, err := s.catalog.TrendingByType(ctx, "movie", "day", perListFetch); err == nil {
		lists = append(lists, trending)
	} else {
		s.logf("games daily trending fetch failed: %v", err)
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
				BackdropURL: details.BackdropURL,
				ReleaseDate: details.ReleaseDate,
				Rating:      details.VoteAverage,
			}
			cand := candidate{card: card, cast: details.Cast, directors: details.Directors}
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

func buildPeopleQuestions(mode Mode, pool []candidate, count int, intn func(int) int) []Question {
	questions := make([]Question, 0, count)
	order := permute(len(pool), intn)
	for _, index := range order {
		if len(questions) >= count {
			break
		}
		subject := pool[index]
		var correct PersonCard
		if mode == ModeMovieDirector || mode == ModeDirectorMovie {
			member := subject.directors[0]
			correct = PersonCard{member.TMDBID, member.Name, member.ProfileURL, member.Job}
		} else {
			member := subject.cast[0]
			correct = PersonCard{member.TMDBID, member.Name, member.ProfileURL, member.Character}
		}
		if correct.TMDBID <= 0 {
			continue
		}
		people := []PersonCard{correct}
		seen := map[int]bool{correct.TMDBID: true}
		credited := make(map[int]bool)
		if mode == ModeMovieDirector {
			for _, member := range subject.directors {
				credited[member.TMDBID] = true
			}
		}
		if mode == ModeMovieActor {
			for _, member := range subject.cast {
				credited[member.TMDBID] = true
			}
		}
		options := []TitleCard{subject.card}
		seenTitles := map[int]bool{subject.card.TMDBID: true}
		for attempts := 0; attempts < maxPairAttempts && (len(people) < 4 || len(options) < 4); attempts++ {
			decoy := pool[intn(len(pool))]
			if len(options) < 4 && !seenTitles[decoy.card.TMDBID] {
				seenTitles[decoy.card.TMDBID] = true
				options = append(options, decoy.card)
			}
			if len(people) < 4 {
				var person PersonCard
				if mode == ModeMovieDirector || mode == ModeDirectorMovie {
					m := decoy.directors[0]
					person = PersonCard{m.TMDBID, m.Name, m.ProfileURL, m.Job}
				} else {
					m := decoy.cast[0]
					person = PersonCard{m.TMDBID, m.Name, m.ProfileURL, m.Character}
				}
				if person.TMDBID > 0 && !seen[person.TMDBID] && !credited[person.TMDBID] {
					seen[person.TMDBID] = true
					people = append(people, person)
				}
			}
		}
		if len(people) < 4 || len(options) < 4 {
			continue
		}
		shufflePeople(people, intn)
		shuffleCards(options, intn)
		card := subject.card
		question := Question{ID: fmt.Sprintf("q_%02d", len(questions)+1), Mode: mode, Prompt: prompts[mode], AnswerID: correct.TMDBID}
		if mode == ModeMovieDirector || mode == ModeMovieActor {
			question.Card = &card
			question.People = people
		} else {
			question.Person = &correct
			question.Options = options
			question.AnswerID = subject.card.TMDBID
		}
		questions = append(questions, question)
	}
	return questions
}

func shufflePeople(items []PersonCard, intn func(int) int) {
	for i := len(items) - 1; i > 0; i-- {
		j := intn(i + 1)
		items[i], items[j] = items[j], items[i]
	}
}

// buildPairQuestions forms unique-title pairs and progressively narrows the
// metric gap, so later rounds are harder without recycling the same movies.
func buildPairQuestions(mode Mode, pool []candidate, count int, intn func(int) int) []Question {
	questions := make([]Question, 0, count)
	if len(pool) < 2 {
		return questions
	}

	usage := make(map[int]int)
	usedPairs := make(map[string]bool)
	attempts := 0
	limit := count * maxPairAttempts
	maxUsage := 1
	if len(pool) < count*2 {
		maxUsage = 2
	}
	for len(questions) < count && attempts < limit {
		attempts++
		i := intn(len(pool))
		j := intn(len(pool))
		if i == j {
			continue
		}
		a, b := pool[i], pool[j]
		pairKey := pairKey(a.card.TMDBID, b.card.TMDBID)
		if usedPairs[pairKey] {
			continue
		}
		if usage[a.card.TMDBID] >= maxUsage || usage[b.card.TMDBID] >= maxUsage {
			continue
		}
		if len(pool) >= count*3 && !fitsDifficulty(mode, a, b, len(questions), count) {
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
	return questions
}

func fitsDifficulty(mode Mode, a, b candidate, index, count int) bool {
	progress := float64(index) / float64(max(1, count-1))
	switch mode {
	case ModeReleaseDate:
		days := a.releaseDate.Sub(b.releaseDate).Hours() / 24
		if days < 0 {
			days = -days
		}
		return days <= (35.0-progress*31.0)*365.25
	case ModeRating:
		diff := a.card.Rating - b.card.Rating
		if diff < 0 {
			diff = -diff
		}
		return diff <= 3.0-progress*2.4
	default:
		return true
	}
}

// makeQuestion validates a pair for the mode and builds the question with the
// correct answer side. ok=false means the pair is ambiguous or ineligible.
func makeQuestion(mode Mode, a, b candidate, index int) (Question, bool) {
	answer, ok := evaluate(mode, a, b)
	if !ok {
		return Question{}, false
	}
	left, right := a.card, b.card
	return Question{
		ID:     fmt.Sprintf("q_%02d", index+1),
		Mode:   mode,
		Prompt: prompts[mode],
		Left:   &left,
		Right:  &right,
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

// buildPosterQuestions turns pool titles into multiple-choice rounds: one
// correct card (shown as a backdrop still) plus shuffled decoy options. Each
// title is the correct answer at most once per set.
func buildPosterQuestions(pool []candidate, count int, intn func(int) int) []Question {
	questions := make([]Question, 0, count)
	if len(pool) < posterOptionCount {
		return questions
	}
	for _, idx := range permute(len(pool), intn) {
		if len(questions) >= count {
			break
		}
		correct := pool[idx]
		seen := map[int]bool{correct.card.TMDBID: true}
		options := []TitleCard{correct.card}
		attempts := 0
		for len(options) < posterOptionCount && attempts < maxPairAttempts {
			attempts++
			decoy := pool[intn(len(pool))]
			if seen[decoy.card.TMDBID] {
				continue
			}
			seen[decoy.card.TMDBID] = true
			options = append(options, decoy.card)
		}
		if len(options) < posterOptionCount {
			continue
		}
		shuffleCards(options, intn)
		card := correct.card
		questions = append(questions, Question{
			ID:       fmt.Sprintf("q_%02d", len(questions)+1),
			Mode:     ModePoster,
			Prompt:   prompts[ModePoster],
			Card:     &card,
			Options:  options,
			AnswerID: correct.card.TMDBID,
		})
	}
	return questions
}

// buildTimelineQuestions samples sets of titles with pairwise-distinct release
// years (so the ordering is never ambiguous) and ships them shuffled.
func buildTimelineQuestions(pool []candidate, count int, intn func(int) int) []Question {
	questions := make([]Question, 0, count)
	if len(pool) < timelineItemCount {
		return questions
	}
	usedSets := make(map[string]bool)
	attempts := 0
	limit := count * maxPairAttempts
	for len(questions) < count && attempts < limit {
		attempts++
		picked := make([]candidate, 0, timelineItemCount)
		years := make(map[int]bool)
		ids := make(map[int]bool)
		inner := 0
		for len(picked) < timelineItemCount && inner < maxPairAttempts {
			inner++
			c := pool[intn(len(pool))]
			year := c.releaseDate.Year()
			if ids[c.card.TMDBID] || years[year] {
				continue
			}
			ids[c.card.TMDBID] = true
			years[year] = true
			picked = append(picked, c)
		}
		if len(picked) < timelineItemCount {
			continue
		}
		key := setKey(picked)
		if usedSets[key] {
			continue
		}
		usedSets[key] = true
		items := make([]TitleCard, 0, len(picked))
		for _, c := range picked {
			items = append(items, c.card)
		}
		shuffleCards(items, intn)
		questions = append(questions, Question{
			ID:     fmt.Sprintf("q_%02d", len(questions)+1),
			Mode:   ModeTimeline,
			Prompt: prompts[ModeTimeline],
			Items:  items,
		})
	}
	return questions
}

// buildYearQuestions picks distinct titles; the client scores the guess against
// the card's release date.
func buildYearQuestions(pool []candidate, count int, intn func(int) int) []Question {
	questions := make([]Question, 0, count)
	for _, idx := range permute(len(pool), intn) {
		if len(questions) >= count {
			break
		}
		card := pool[idx].card
		questions = append(questions, Question{
			ID:     fmt.Sprintf("q_%02d", len(questions)+1),
			Mode:   ModeYear,
			Prompt: prompts[ModeYear],
			Card:   &card,
		})
	}
	return questions
}

// permute returns a shuffled index order via the provided RNG.
func permute(n int, intn func(int) int) []int {
	order := make([]int, n)
	for i := range order {
		order[i] = i
	}
	for i := n - 1; i > 0; i-- {
		j := intn(i + 1)
		order[i], order[j] = order[j], order[i]
	}
	return order
}

func shuffleCards(cards []TitleCard, intn func(int) int) {
	for i := len(cards) - 1; i > 0; i-- {
		j := intn(i + 1)
		cards[i], cards[j] = cards[j], cards[i]
	}
}

// setKey identifies an unordered candidate set for dedup.
func setKey(picked []candidate) string {
	ids := make([]int, 0, len(picked))
	for _, c := range picked {
		ids = append(ids, c.card.TMDBID)
	}
	sort.Ints(ids)
	return fmt.Sprint(ids)
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
