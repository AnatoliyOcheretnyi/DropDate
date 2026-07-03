package cinematch

import (
	"context"
	"errors"
	"testing"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/saved"
)

type fakeCatalog struct {
	byMedia map[string][]release.DiscoverItem
	calls   []release.DiscoverParams
}

func (f *fakeCatalog) Discover(_ context.Context, p release.DiscoverParams) ([]release.DiscoverItem, error) {
	f.calls = append(f.calls, p)
	return f.byMedia[p.MediaType], nil
}

type fakeSaved struct{ rows []saved.Title }

func (f *fakeSaved) SeedRows(_ context.Context, _ string) ([]saved.Title, error) {
	return f.rows, nil
}

func item(media string, id int) release.DiscoverItem {
	return release.DiscoverItem{TMDBID: id, MediaType: media, Title: "X"}
}

func TestResolveParams_MovieGenre(t *testing.T) {
	p := resolveParams(map[string]string{"media": "movie", "genre": "scary"})
	if p.MediaType != "movie" {
		t.Fatalf("mediaType = %q", p.MediaType)
	}
	if !contains(p.WithGenres, mvHorror) {
		t.Fatalf("movie scary should include horror, got %v", p.WithGenres)
	}
}

func TestResolveParams_TVUsesTVGenresAndType(t *testing.T) {
	p := resolveParams(map[string]string{
		"media":  "tv",
		"genre":  "scary",
		"format": "mini",
		"status": "ended",
	})
	if p.MediaType != "tv" {
		t.Fatalf("mediaType = %q", p.MediaType)
	}
	if contains(p.WithGenres, mvHorror) {
		t.Fatalf("tv must not use movie horror id, got %v", p.WithGenres)
	}
	if !contains(p.WithGenres, tvMystery) {
		t.Fatalf("tv scary should include mystery, got %v", p.WithGenres)
	}
	if p.WithType != "2" || p.WithStatus != "3" {
		t.Fatalf("tv format/status not applied: type=%q status=%q", p.WithType, p.WithStatus)
	}
}

func TestResolveParams_RatingAndAnime(t *testing.T) {
	p := resolveParams(map[string]string{
		"media":  "movie",
		"origin": "anime",
		"rating": "high",
	})
	if p.OriginalLanguage != "ja" {
		t.Fatalf("anime should set ja, got %q", p.OriginalLanguage)
	}
	if !contains(p.WithGenres, mvAnimation) {
		t.Fatalf("anime should add animation genre, got %v", p.WithGenres)
	}
	if p.VoteAverageGTE != 7.5 {
		t.Fatalf("high rating should set vote_average floor, got %v", p.VoteAverageGTE)
	}
}

func TestResolveParams_MovieKnobsIgnoredForTV(t *testing.T) {
	p := resolveParams(map[string]string{"media": "tv", "length": "short", "audience": "family"})
	if p.RuntimeLTE != 0 || p.CertificationLTE != "" {
		t.Fatalf("movie-only knobs leaked into tv params: %+v", p)
	}
}

func TestPicks_QueriesChosenMediaOnly(t *testing.T) {
	catalog := &fakeCatalog{byMedia: map[string][]release.DiscoverItem{
		"movie": {item("movie", 1), item("movie", 2), item("movie", 3)},
		"tv":    {item("tv", 9)},
	}}
	svc := NewService(catalog, nil, nil)

	res, err := svc.Picks(context.Background(), PicksRequest{
		Answers: map[string]string{"media": "movie", "genre": "drama"},
		Count:   10,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	for _, p := range res.Items {
		if p.MediaType != "movie" {
			t.Fatalf("tv item leaked into movie picks: %+v", p)
		}
	}
	if len(res.Items) != 3 {
		t.Fatalf("expected 3 movie picks, got %d", len(res.Items))
	}
}

func TestPicks_ExcludesShownAndSaved(t *testing.T) {
	catalog := &fakeCatalog{byMedia: map[string][]release.DiscoverItem{
		"movie": {item("movie", 1), item("movie", 2), item("movie", 3), item("movie", 4)},
	}}
	saved := &fakeSaved{rows: []saved.Title{{TMDBID: 2, MediaType: "movie"}}}
	svc := NewService(catalog, saved, nil)

	res, err := svc.Picks(context.Background(), PicksRequest{
		Answers:     map[string]string{"media": "movie"},
		Count:       10,
		ExcludeKeys: []string{"movie:3"},
		UserID:      "u1",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	for _, p := range res.Items {
		key := itemKey(p.MediaType, p.TMDBID)
		if key == "movie:2" || key == "movie:3" {
			t.Fatalf("excluded key %s leaked", key)
		}
	}
	if len(res.Items) != 2 {
		t.Fatalf("expected 2 after exclusions, got %d", len(res.Items))
	}
}

func TestPicks_FallbackWhenEmpty(t *testing.T) {
	broad := &fakeCatalog{byMedia: map[string][]release.DiscoverItem{
		"movie": {item("movie", 9)},
	}}
	svc := NewService(&conditionalCatalog{broad: broad}, nil, nil)

	res, err := svc.Picks(context.Background(), PicksRequest{
		Answers: map[string]string{"media": "movie", "genre": "scary", "origin": "anime"},
		Count:   6,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(res.Items) != 1 {
		t.Fatalf("expected 1 fallback pick, got %d", len(res.Items))
	}
}

func TestPicks_InvalidAnswer(t *testing.T) {
	svc := NewService(&fakeCatalog{}, nil, nil)
	_, err := svc.Picks(context.Background(), PicksRequest{
		Answers: map[string]string{"genre": "nope"},
	})
	if !errors.Is(err, ErrInvalidRequest) {
		t.Fatalf("expected ErrInvalidRequest, got %v", err)
	}
}

func TestQuestions_MediaFirstAndTenPerType(t *testing.T) {
	svc := NewService(&fakeCatalog{}, nil, nil)
	items := svc.Questions().Items
	if len(items) == 0 || items[0].ID != "media" {
		t.Fatalf("first question must be media, got %+v", items)
	}
	count := func(media string) int {
		n := 0
		for _, q := range items {
			if q.AppliesTo == "both" || q.AppliesTo == media {
				n++
			}
		}
		return n
	}
	if got := count("movie"); got != 10 {
		t.Fatalf("movie flow should be 10 questions, got %d", got)
	}
	if got := count("tv"); got != 10 {
		t.Fatalf("tv flow should be 10 questions, got %d", got)
	}
}

// conditionalCatalog returns nothing when filters are set, broad results otherwise.
type conditionalCatalog struct {
	broad *fakeCatalog
}

func (c *conditionalCatalog) Discover(ctx context.Context, p release.DiscoverParams) ([]release.DiscoverItem, error) {
	if len(p.WithGenres) > 0 || p.OriginalLanguage != "" {
		return nil, nil
	}
	return c.broad.Discover(ctx, p)
}

func contains(values []int, target int) bool {
	for _, v := range values {
		if v == target {
			return true
		}
	}
	return false
}
