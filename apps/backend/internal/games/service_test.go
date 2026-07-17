package games

import (
	"context"
	"fmt"
	"io"
	"log"
	"math/rand"
	"strconv"
	"testing"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
)

// datedDetails builds a details map keyed by the suggestion ids produced by
// movieSuggestions, giving each title a full release date for the given year.
func datedDetails(years ...int) map[int]release.Details {
	m := make(map[int]release.Details, len(years))
	for i, year := range years {
		m[i+1] = release.Details{ReleaseDate: fmt.Sprintf("%04d-06-15", year)}
	}
	return m
}

type stubCatalog struct {
	popular  []release.Suggestion
	topRated []release.Suggestion
	trending []release.Suggestion
	details  map[int]release.Details
}

func (s stubCatalog) Popular(_ context.Context, _ string, _ int) ([]release.Suggestion, error) {
	return s.popular, nil
}
func (s stubCatalog) TopRated(_ context.Context, _ string, _ int) ([]release.Suggestion, error) {
	return s.topRated, nil
}
func (s stubCatalog) TrendingByType(_ context.Context, _, _ string, _ int) ([]release.Suggestion, error) {
	return s.trending, nil
}
func (s stubCatalog) Details(_ context.Context, id int, _ string) (release.Details, error) {
	return s.details[id], nil
}

func newTestService(catalog catalogSource) *Service {
	svc := NewService(catalog, log.New(io.Discard, "", 0))
	svc.now = func() time.Time { return time.Date(2026, 6, 27, 12, 0, 0, 0, time.UTC) }
	svc.rng = rand.New(rand.NewSource(1)) // deterministic
	return svc
}

func movieSuggestions(years ...int) []release.Suggestion {
	out := make([]release.Suggestion, 0, len(years))
	for i, year := range years {
		out = append(out, release.Suggestion{
			ID:        i + 1,
			Title:     "Movie " + strconv.Itoa(i+1),
			MediaType: "movie",
			Year:      strconv.Itoa(year),
		})
	}
	return out
}

func TestGenerateReleaseDateQuestions(t *testing.T) {
	years := []int{2001, 2005, 2010, 2015, 2020, 2022}
	catalog := stubCatalog{
		popular: movieSuggestions(years...),
		details: datedDetails(years...),
	}
	svc := newTestService(catalog)

	result, err := svc.Generate(context.Background(), ModeReleaseDate, 3)
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if len(result.Items) != 3 {
		t.Fatalf("expected 3 questions, got %d", len(result.Items))
	}
	yearOf := map[int]int{}
	for i, y := range []int{2001, 2005, 2010, 2015, 2020, 2022} {
		yearOf[i+1] = y
	}
	for _, q := range result.Items {
		if q.Mode != ModeReleaseDate {
			t.Fatalf("unexpected mode %s", q.Mode)
		}
		if q.Left.TMDBID == q.Right.TMDBID {
			t.Fatalf("question pairs a title with itself")
		}
		leftYear := yearOf[q.Left.TMDBID]
		rightYear := yearOf[q.Right.TMDBID]
		wantAnswer := "left"
		if rightYear < leftYear {
			wantAnswer = "right"
		}
		if q.Answer != wantAnswer {
			t.Fatalf("q %s: left=%d right=%d answer=%s want=%s", q.ID, leftYear, rightYear, q.Answer, wantAnswer)
		}
	}
}

func TestGenerateRatingRespectsThreshold(t *testing.T) {
	// Two titles only, ratings within 0.4 -> ambiguous -> no valid pair.
	catalog := stubCatalog{
		popular: movieSuggestions(2001, 2002),
		details: map[int]release.Details{
			1: {VoteAverage: 8.0},
			2: {VoteAverage: 8.2},
		},
	}
	svc := newTestService(catalog)

	result, err := svc.Generate(context.Background(), ModeRating, 5)
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if len(result.Items) != 0 {
		t.Fatalf("expected 0 questions for sub-threshold gap, got %d", len(result.Items))
	}
}

func TestGenerateRatingAnswerCorrect(t *testing.T) {
	catalog := stubCatalog{
		popular: movieSuggestions(2001, 2002, 2003),
		details: map[int]release.Details{
			1: {VoteAverage: 6.0},
			2: {VoteAverage: 8.5},
			3: {VoteAverage: 7.2},
		},
	}
	svc := newTestService(catalog)

	result, err := svc.Generate(context.Background(), ModeRating, 3)
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if len(result.Items) == 0 {
		t.Fatalf("expected questions, got none")
	}
	ratingOf := map[int]float64{1: 6.0, 2: 8.5, 3: 7.2}
	for _, q := range result.Items {
		leftR := ratingOf[q.Left.TMDBID]
		rightR := ratingOf[q.Right.TMDBID]
		wantAnswer := "left"
		if rightR > leftR {
			wantAnswer = "right"
		}
		if q.Answer != wantAnswer {
			t.Fatalf("q %s: left=%.1f right=%.1f answer=%s want=%s", q.ID, leftR, rightR, q.Answer, wantAnswer)
		}
		if q.Left.Rating == 0 || q.Right.Rating == 0 {
			t.Fatalf("rating mode cards must expose rating values")
		}
	}
}

func TestNoDuplicatePairsWithinSession(t *testing.T) {
	catalog := stubCatalog{
		popular: movieSuggestions(2001, 2010),
		details: datedDetails(2001, 2010),
	}
	svc := newTestService(catalog)

	// Only one valid pair exists; requesting more must not duplicate it.
	result, err := svc.Generate(context.Background(), ModeReleaseDate, 5)
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected exactly 1 unique pair, got %d", len(result.Items))
	}
}

// backdroppedDetails builds details with dates, ratings and backdrops so every
// mode's pool filter accepts the titles.
func backdroppedDetails(years ...int) map[int]release.Details {
	m := make(map[int]release.Details, len(years))
	for i, year := range years {
		m[i+1] = release.Details{
			ReleaseDate: fmt.Sprintf("%04d-06-15", year),
			VoteAverage: 6.0 + float64(i)*0.5,
			BackdropURL: fmt.Sprintf("https://img/%d.jpg", i+1),
		}
	}
	return m
}

func TestGeneratePosterQuestions(t *testing.T) {
	years := []int{2001, 2005, 2010, 2015, 2020, 2022}
	catalog := stubCatalog{
		popular: movieSuggestions(years...),
		details: backdroppedDetails(years...),
	}
	svc := newTestService(catalog)

	result, err := svc.Generate(context.Background(), ModePoster, 3)
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if len(result.Items) != 3 {
		t.Fatalf("expected 3 questions, got %d", len(result.Items))
	}
	seenCorrect := map[int]bool{}
	for _, q := range result.Items {
		if q.Card == nil || len(q.Options) != posterOptionCount {
			t.Fatalf("poster question must carry a card and %d options", posterOptionCount)
		}
		if q.AnswerID != q.Card.TMDBID {
			t.Fatalf("answerId %d must match card %d", q.AnswerID, q.Card.TMDBID)
		}
		if seenCorrect[q.AnswerID] {
			t.Fatalf("title %d is the correct answer twice", q.AnswerID)
		}
		seenCorrect[q.AnswerID] = true
		found := false
		ids := map[int]bool{}
		for _, opt := range q.Options {
			if ids[opt.TMDBID] {
				t.Fatalf("duplicate option %d", opt.TMDBID)
			}
			ids[opt.TMDBID] = true
			if opt.TMDBID == q.AnswerID {
				found = true
			}
		}
		if !found {
			t.Fatalf("correct answer missing from options")
		}
	}
}

func TestGenerateTimelineQuestions(t *testing.T) {
	years := []int{2001, 2005, 2010, 2015, 2020, 2022}
	catalog := stubCatalog{
		popular: movieSuggestions(years...),
		details: datedDetails(years...),
	}
	svc := newTestService(catalog)

	result, err := svc.Generate(context.Background(), ModeTimeline, 2)
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if len(result.Items) != 2 {
		t.Fatalf("expected 2 questions, got %d", len(result.Items))
	}
	for _, q := range result.Items {
		if len(q.Items) != timelineItemCount {
			t.Fatalf("expected %d items, got %d", timelineItemCount, len(q.Items))
		}
		yearsSeen := map[string]bool{}
		for _, item := range q.Items {
			if item.ReleaseDate == "" {
				t.Fatalf("timeline items must carry release dates")
			}
			year := item.ReleaseDate[:4]
			if yearsSeen[year] {
				t.Fatalf("timeline years must be pairwise distinct, %s repeats", year)
			}
			yearsSeen[year] = true
		}
	}
}

func TestGenerateYearQuestions(t *testing.T) {
	years := []int{2001, 2005, 2010}
	catalog := stubCatalog{
		popular: movieSuggestions(years...),
		details: datedDetails(years...),
	}
	svc := newTestService(catalog)

	result, err := svc.Generate(context.Background(), ModeYear, 5)
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	// Only 3 distinct titles exist; each may be asked once.
	if len(result.Items) != 3 {
		t.Fatalf("expected 3 questions, got %d", len(result.Items))
	}
	seen := map[int]bool{}
	for _, q := range result.Items {
		if q.Card == nil || q.Card.ReleaseDate == "" {
			t.Fatalf("year question must carry a dated card")
		}
		if seen[q.Card.TMDBID] {
			t.Fatalf("title %d asked twice", q.Card.TMDBID)
		}
		seen[q.Card.TMDBID] = true
	}
}

func TestGenerateSeededIsDeterministic(t *testing.T) {
	years := []int{2001, 2005, 2010, 2015, 2020, 2022}
	catalog := stubCatalog{
		popular: movieSuggestions(years...),
		details: datedDetails(years...),
	}
	svc := newTestService(catalog)

	seed := DailySeed(ModeReleaseDate, time.Date(2026, 7, 18, 3, 0, 0, 0, time.UTC))
	first, err := svc.GenerateSeeded(context.Background(), ModeReleaseDate, 3, seed)
	if err != nil {
		t.Fatalf("GenerateSeeded: %v", err)
	}
	second, err := svc.GenerateSeeded(context.Background(), ModeReleaseDate, 3, seed)
	if err != nil {
		t.Fatalf("GenerateSeeded: %v", err)
	}
	if len(first.Items) != len(second.Items) {
		t.Fatalf("seeded runs differ in length: %d vs %d", len(first.Items), len(second.Items))
	}
	for i := range first.Items {
		a, b := first.Items[i], second.Items[i]
		if a.Left.TMDBID != b.Left.TMDBID || a.Right.TMDBID != b.Right.TMDBID || a.Answer != b.Answer {
			t.Fatalf("seeded runs diverge at question %d", i)
		}
	}
	if DailySeed(ModeReleaseDate, time.Date(2026, 7, 19, 3, 0, 0, 0, time.UTC)) == seed {
		t.Fatal("different days must produce different seeds")
	}
}

func TestSupportedModeAndNormalizeCount(t *testing.T) {
	if _, ok := SupportedMode("release_date"); !ok {
		t.Fatal("release_date should be supported")
	}
	if _, ok := SupportedMode("RATING"); !ok {
		t.Fatal("mode match should be case-insensitive")
	}
	if _, ok := SupportedMode("budget"); ok {
		t.Fatal("budget should not be supported in v1")
	}
	if NormalizeCount(0) != defaultCount {
		t.Fatalf("expected default %d", defaultCount)
	}
	if NormalizeCount(999) != maxCount {
		t.Fatalf("expected clamp to %d", maxCount)
	}
}
