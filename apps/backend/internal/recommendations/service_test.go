package recommendations

import (
	"context"
	"errors"
	"io"
	"log"
	"testing"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/saved"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/taste"
)

type stubSaved struct {
	rows []saved.Title
	err  error
}

type stubTaste struct {
	rankings map[string][]taste.Item
}

func (s stubTaste) Rankings(_ context.Context, _ string, kind string) ([]taste.Item, error) {
	return s.rankings[kind], nil
}

func (s stubSaved) SeedRows(_ context.Context, _ string) ([]saved.Title, error) {
	return s.rows, s.err
}

type stubCandidates struct {
	// bySeed maps a seed tmdbID to the suggestions it returns.
	bySeed map[int][]release.Suggestion
	// failSeeds is the set of seed tmdbIDs whose fetch errors.
	failSeeds     map[int]bool
	calls         int
	discoverItems []release.DiscoverItem
}

func (s *stubCandidates) Discover(_ context.Context, _ release.DiscoverParams) ([]release.DiscoverItem, error) {
	return s.discoverItems, nil
}

func (s *stubCandidates) Recommendations(_ context.Context, id int, _ string, _ int) ([]release.Suggestion, error) {
	s.calls++
	if s.failSeeds[id] {
		return nil, errors.New("tmdb down")
	}
	return s.bySeed[id], nil
}

func ratingPtr(v int) *int             { return &v }
func tmdbRatingPtr(v float64) *float64 { return &v }

func newTestService(saved stubSaved, candidates *stubCandidates) *Service {
	svc := NewService(saved, candidates, nil, log.New(io.Discard, "", 0))
	svc.now = func() time.Time { return time.Date(2026, 6, 27, 12, 0, 0, 0, time.UTC) }
	return svc
}

func TestGenerateExcludesSavedAndDisliked(t *testing.T) {
	now := time.Date(2026, 6, 27, 12, 0, 0, 0, time.UTC)
	saved := stubSaved{rows: []saved.Title{
		{TMDBID: 1, MediaType: "movie", ListTypes: []string{"favorite"}, UpdatedAt: now},
		{TMDBID: 2, MediaType: "movie", ListTypes: []string{"disliked"}, UpdatedAt: now},
		{TMDBID: 3, MediaType: "movie", ListTypes: []string{"watchlist"}, UpdatedAt: now},
	}}
	candidates := &stubCandidates{bySeed: map[int][]release.Suggestion{
		1: {
			{ID: 2, MediaType: "movie", Title: "Disliked Title"}, // excluded: disliked
			{ID: 3, MediaType: "movie", Title: "Already Saved"},  // excluded: in watchlist
			{ID: 99, MediaType: "movie", Title: "Fresh Pick"},    // kept
		},
	}}

	svc := newTestService(saved, candidates)
	result, err := svc.Generate(context.Background(), "user-1", 18)
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d: %+v", len(result.Items), result.Items)
	}
	if result.Items[0].TMDBID != 99 {
		t.Fatalf("expected fresh pick 99, got %d", result.Items[0].TMDBID)
	}
}

func TestGenerateScoresOverlapHigher(t *testing.T) {
	now := time.Date(2026, 6, 27, 12, 0, 0, 0, time.UTC)
	// Two favorite seeds. Candidate 50 is recommended by both seeds (overlap),
	// candidate 60 only by one. Overlap bonus should rank 50 first.
	saved := stubSaved{rows: []saved.Title{
		{TMDBID: 1, MediaType: "movie", ListTypes: []string{"favorite"}, UpdatedAt: now},
		{TMDBID: 2, MediaType: "movie", ListTypes: []string{"favorite"}, UpdatedAt: now},
	}}
	candidates := &stubCandidates{bySeed: map[int][]release.Suggestion{
		1: {{ID: 50, MediaType: "movie", Title: "Overlap"}, {ID: 60, MediaType: "movie", Title: "Single"}},
		2: {{ID: 50, MediaType: "movie", Title: "Overlap"}},
	}}

	svc := newTestService(saved, candidates)
	result, err := svc.Generate(context.Background(), "user-2", 18)
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if len(result.Items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(result.Items))
	}
	if result.Items[0].TMDBID != 50 {
		t.Fatalf("expected overlap candidate 50 first, got %d", result.Items[0].TMDBID)
	}
	if result.Items[0].Reason.SeedCount != 2 {
		t.Fatalf("expected seedCount 2, got %d", result.Items[0].Reason.SeedCount)
	}
	if result.Items[0].Reason.PrimarySource != "favorite" {
		t.Fatalf("expected primarySource favorite, got %q", result.Items[0].Reason.PrimarySource)
	}
}

func TestSeedSelectionWeightsAndEligibility(t *testing.T) {
	now := time.Date(2026, 6, 27, 12, 0, 0, 0, time.UTC)
	rows := []saved.Title{
		{TMDBID: 1, MediaType: "movie", ListTypes: []string{"favorite"}, UpdatedAt: now},
		{TMDBID: 2, MediaType: "movie", ListTypes: []string{"watched"}, UserRating: ratingPtr(9), UpdatedAt: now},
		{TMDBID: 3, MediaType: "movie", ListTypes: []string{"watched"}, UserRating: ratingPtr(5), UpdatedAt: now},
		{TMDBID: 4, MediaType: "movie", ListTypes: []string{"watchlist"}, TMDBRating: tmdbRatingPtr(8.1), UpdatedAt: now},
		{TMDBID: 5, MediaType: "movie", ListTypes: []string{"watchlist"}, TMDBRating: tmdbRatingPtr(6.0), UpdatedAt: now}, // not a seed
		{TMDBID: 6, MediaType: "movie", ListTypes: []string{"follow"}, UpdatedAt: now},                                    // not a seed
	}

	seeds := selectSeeds(rows, now)
	if len(seeds) != 4 {
		t.Fatalf("expected 4 seeds, got %d: %+v", len(seeds), seeds)
	}
	// Highest weight first: favorite (5), watched-rated (4), watched (2), watchlist (1).
	wantOrder := []int{1, 2, 3, 4}
	for i, want := range wantOrder {
		if seeds[i].tmdbID != want {
			t.Fatalf("seed %d: expected tmdbID %d, got %d", i, want, seeds[i].tmdbID)
		}
	}
	if seeds[0].weight != weightFavorite {
		t.Fatalf("expected favorite weight %d, got %d", weightFavorite, seeds[0].weight)
	}
	if seeds[1].weight != weightWatchedRated {
		t.Fatalf("expected watched-rated weight %d, got %d", weightWatchedRated, seeds[1].weight)
	}
}

func TestSeedDedupKeepsHighestWeight(t *testing.T) {
	now := time.Date(2026, 6, 27, 12, 0, 0, 0, time.UTC)
	// Same title in favorite and watched-rated lists -> single seed, weight 5.
	rows := []saved.Title{
		{TMDBID: 1, MediaType: "movie", ListTypes: []string{"watched"}, UserRating: ratingPtr(9), UpdatedAt: now},
		{TMDBID: 1, MediaType: "movie", ListTypes: []string{"favorite"}, UpdatedAt: now},
	}
	seeds := selectSeeds(rows, now)
	if len(seeds) != 1 {
		t.Fatalf("expected 1 deduped seed, got %d", len(seeds))
	}
	if seeds[0].weight != weightFavorite {
		t.Fatalf("expected weight %d, got %d", weightFavorite, seeds[0].weight)
	}
}

func TestDislikedSeedDemotesLookalikes(t *testing.T) {
	now := time.Date(2026, 6, 27, 12, 0, 0, 0, time.UTC)
	// A favorite and a disliked seed both recommend candidate 50; the disliked
	// seed also uniquely recommends 60. 50's score is dragged below 60's, and
	// 70 (from favorite only) stays on top.
	saved := stubSaved{rows: []saved.Title{
		{TMDBID: 1, MediaType: "movie", ListTypes: []string{"favorite"}, UpdatedAt: now},
		{TMDBID: 2, MediaType: "movie", ListTypes: []string{"disliked"}, UpdatedAt: now},
	}}
	candidates := &stubCandidates{bySeed: map[int][]release.Suggestion{
		1: {{ID: 70, MediaType: "movie", Title: "Pure"}, {ID: 50, MediaType: "movie", Title: "Mixed"}},
		2: {{ID: 50, MediaType: "movie", Title: "Mixed"}, {ID: 60, MediaType: "movie", Title: "Only Disliked"}},
	}}

	svc := newTestService(saved, candidates)
	result, err := svc.Generate(context.Background(), "user-neg", 18)
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	// 60 comes only from the disliked seed (score -3) -> dropped.
	// 50 = favorite(5) + disliked(-3) = 2, 70 = favorite(5) -> 70 first, 50 kept.
	if len(result.Items) != 2 {
		t.Fatalf("expected 2 items (60 dropped), got %d: %+v", len(result.Items), result.Items)
	}
	if result.Items[0].TMDBID != 70 || result.Items[1].TMDBID != 50 {
		t.Fatalf("expected order [70, 50], got [%d, %d]", result.Items[0].TMDBID, result.Items[1].TMDBID)
	}
}

func TestDiversityCapSpreadsAcrossSeeds(t *testing.T) {
	now := time.Date(2026, 6, 27, 12, 0, 0, 0, time.UTC)
	// Seed A yields six equally-scored lookalikes; seed B yields one. With the
	// per-seed cap, B's single pick must surface within the top 5 instead of
	// being buried under A's flood.
	saved := stubSaved{rows: []saved.Title{
		{TMDBID: 1, MediaType: "movie", ListTypes: []string{"favorite"}, UpdatedAt: now},
		{TMDBID: 2, MediaType: "movie", ListTypes: []string{"favorite"}, UpdatedAt: now},
	}}
	candidates := &stubCandidates{bySeed: map[int][]release.Suggestion{
		1: {
			{ID: 10, MediaType: "movie", Title: "A1"}, {ID: 11, MediaType: "movie", Title: "A2"},
			{ID: 12, MediaType: "movie", Title: "A3"}, {ID: 13, MediaType: "movie", Title: "A4"},
			{ID: 14, MediaType: "movie", Title: "A5"}, {ID: 15, MediaType: "movie", Title: "A6"},
		},
		2: {{ID: 20, MediaType: "movie", Title: "B1"}},
	}}

	svc := newTestService(saved, candidates)
	result, err := svc.Generate(context.Background(), "user-div", 5)
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if len(result.Items) != 5 {
		t.Fatalf("expected 5 items, got %d", len(result.Items))
	}
	found := false
	for _, item := range result.Items {
		if item.TMDBID == 20 {
			found = true
		}
	}
	if !found {
		t.Fatalf("diversity cap should surface seed B's pick (20): %+v", result.Items)
	}
}

func TestGeneratePartialFailureStillReturns(t *testing.T) {
	now := time.Date(2026, 6, 27, 12, 0, 0, 0, time.UTC)
	saved := stubSaved{rows: []saved.Title{
		{TMDBID: 1, MediaType: "movie", ListTypes: []string{"favorite"}, UpdatedAt: now},
		{TMDBID: 2, MediaType: "movie", ListTypes: []string{"favorite"}, UpdatedAt: now},
	}}
	candidates := &stubCandidates{
		bySeed:    map[int][]release.Suggestion{2: {{ID: 70, MediaType: "movie", Title: "Survivor"}}},
		failSeeds: map[int]bool{1: true},
	}

	svc := newTestService(saved, candidates)
	result, err := svc.Generate(context.Background(), "user-3", 18)
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if len(result.Items) != 1 || result.Items[0].TMDBID != 70 {
		t.Fatalf("expected survivor 70, got %+v", result.Items)
	}
}

func TestGenerateNoSeedsReturnsEmpty(t *testing.T) {
	now := time.Date(2026, 6, 27, 12, 0, 0, 0, time.UTC)
	saved := stubSaved{rows: []saved.Title{
		{TMDBID: 1, MediaType: "movie", ListTypes: []string{"follow"}, UpdatedAt: now},
	}}
	candidates := &stubCandidates{}

	svc := newTestService(saved, candidates)
	result, err := svc.Generate(context.Background(), "user-4", 18)
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if len(result.Items) != 0 {
		t.Fatalf("expected no items, got %d", len(result.Items))
	}
	if candidates.calls != 0 {
		t.Fatalf("expected no TMDB calls without seeds, got %d", candidates.calls)
	}
}

func TestGenerateCachesResult(t *testing.T) {
	now := time.Date(2026, 6, 27, 12, 0, 0, 0, time.UTC)
	saved := stubSaved{rows: []saved.Title{
		{TMDBID: 1, MediaType: "movie", ListTypes: []string{"favorite"}, UpdatedAt: now},
	}}
	candidates := &stubCandidates{bySeed: map[int][]release.Suggestion{
		1: {{ID: 80, MediaType: "movie", Title: "Cached"}},
	}}

	svc := newTestService(saved, candidates)
	if _, err := svc.Generate(context.Background(), "user-5", 18); err != nil {
		t.Fatalf("Generate: %v", err)
	}
	firstCalls := candidates.calls
	if _, err := svc.Generate(context.Background(), "user-5", 18); err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if candidates.calls != firstCalls {
		t.Fatalf("expected cached second call (no extra TMDB calls), got %d then %d", firstCalls, candidates.calls)
	}
}

func TestDailyIsStableForUserAndDate(t *testing.T) {
	now := time.Date(2026, 6, 27, 12, 0, 0, 0, time.UTC)
	saved := stubSaved{rows: []saved.Title{{TMDBID: 1, MediaType: "movie", ListTypes: []string{"favorite"}, UpdatedAt: now}}}
	candidates := &stubCandidates{discoverItems: []release.DiscoverItem{
		{TMDBID: 10, MediaType: "movie", Title: "One"},
		{TMDBID: 20, MediaType: "movie", Title: "Two"},
		{TMDBID: 30, MediaType: "movie", Title: "Three"},
	}}
	svc := newTestService(saved, candidates)
	svc.taste = stubTaste{rankings: map[string][]taste.Item{
		"genre":   {{ID: "drama", Comparisons: 3}},
		"country": {{ID: "GB", Comparisons: 3}},
	}}
	first, err := svc.Daily(context.Background(), "user-daily")
	if err != nil {
		t.Fatal(err)
	}
	second, err := svc.Daily(context.Background(), "user-daily")
	if err != nil {
		t.Fatal(err)
	}
	if first.Pick == nil || second.Pick == nil {
		t.Fatal("expected daily pick")
	}
	if first.Date != "2026-06-27" || first.Pick.TMDBID != second.Pick.TMDBID {
		t.Fatalf("daily pick is not stable: %+v %+v", first, second)
	}
	if first.Pick.Reason.Text == "" {
		t.Fatal("expected human-readable reason")
	}
}

func TestDailyReturnsEmptyForColdStart(t *testing.T) {
	svc := newTestService(stubSaved{}, &stubCandidates{})
	result, err := svc.Daily(context.Background(), "cold-user")
	if err != nil {
		t.Fatal(err)
	}
	if result.Pick != nil {
		t.Fatalf("expected no pick, got %+v", result.Pick)
	}
}
