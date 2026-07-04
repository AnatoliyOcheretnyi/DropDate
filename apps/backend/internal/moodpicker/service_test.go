package moodpicker

import (
	"context"
	"errors"
	"testing"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/saved"
)

type fakeSaved struct {
	ids []int
}

func (f *fakeSaved) SeedRows(_ context.Context, _ string) ([]saved.Title, error) {
	rows := make([]saved.Title, 0, len(f.ids))
	for _, id := range f.ids {
		rows = append(rows, saved.Title{TMDBID: id, MediaType: "movie"})
	}
	return rows, nil
}

// fakeCatalog returns a fixed pool, optionally only when constraints are relaxed.
type fakeCatalog struct {
	calls       []release.DiscoverParams
	itemsByPage func(p release.DiscoverParams) []release.DiscoverItem
}

func (f *fakeCatalog) Discover(_ context.Context, p release.DiscoverParams) ([]release.DiscoverItem, error) {
	f.calls = append(f.calls, p)
	if f.itemsByPage == nil {
		return nil, nil
	}
	return f.itemsByPage(p), nil
}

func items(ids ...int) []release.DiscoverItem {
	out := make([]release.DiscoverItem, 0, len(ids))
	for _, id := range ids {
		out = append(out, release.DiscoverItem{TMDBID: id, Title: "T", MediaType: "movie"})
	}
	return out
}

func standardAnswers() map[string]string {
	return map[string]string{
		"mood":      "adrenaline",
		"company":   "friends",
		"time":      "short",
		"era":       "fresh",
		"discovery": "popular",
	}
}

func TestResolveParams_Adrenaline(t *testing.T) {
	p := resolveParams(standardAnswers())

	if p.SortBy != "popularity.desc" {
		t.Fatalf("sortBy = %q, want popularity.desc", p.SortBy)
	}
	if p.VoteCountGTE != 300 {
		t.Fatalf("voteCountGTE = %d, want 300", p.VoteCountGTE)
	}
	if p.RuntimeLTE != 95 {
		t.Fatalf("runtimeLTE = %d, want 95", p.RuntimeLTE)
	}
	if p.ReleaseDateGTE != "2018-01-01" {
		t.Fatalf("releaseDateGTE = %q, want 2018-01-01", p.ReleaseDateGTE)
	}
	// adrenaline (action, thriller, adventure) + friends (comedy, action)
	if !containsAll(p.WithGenres, genreAction, genreThriller, genreAdventure, genreComedy) {
		t.Fatalf("withGenres = %v missing expected genres", p.WithGenres)
	}
}

func TestResolveParams_FamilyExcludesWinOverMood(t *testing.T) {
	answers := map[string]string{
		"mood":      "scary", // adds Horror, Thriller, Mystery
		"company":   "family",
		"time":      "any",
		"era":       "any",
		"discovery": "popular",
	}
	p := resolveParams(answers)

	if contains(p.WithGenres, genreHorror) || contains(p.WithGenres, genreThriller) {
		t.Fatalf("family must exclude horror/thriller, withGenres = %v", p.WithGenres)
	}
	if !contains(p.WithoutGenres, genreHorror) || !contains(p.WithoutGenres, genreThriller) {
		t.Fatalf("withoutGenres = %v should contain horror+thriller", p.WithoutGenres)
	}
	if p.CertificationLTE != "PG-13" || p.CertCountry != "US" {
		t.Fatalf("family certification not applied: %q %q", p.CertificationLTE, p.CertCountry)
	}
}

func TestResolveParams_HiddenGems(t *testing.T) {
	answers := standardAnswers()
	answers["discovery"] = "hidden"
	p := resolveParams(answers)
	if p.SortBy != "vote_average.desc" || p.VoteCountGTE != 150 {
		t.Fatalf("hidden gems params wrong: sort=%q vote=%d", p.SortBy, p.VoteCountGTE)
	}
}

func TestPicks_HappyPath(t *testing.T) {
	catalog := &fakeCatalog{itemsByPage: func(p release.DiscoverParams) []release.DiscoverItem {
		if p.Page == 1 {
			return items(1, 2, 3, 4, 5, 6, 7, 8)
		}
		return nil
	}}
	svc := NewService(catalog, nil, nil)

	res, err := svc.Picks(context.Background(), PicksRequest{Answers: standardAnswers(), Count: 6})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(res.Items) != 6 {
		t.Fatalf("got %d picks, want 6", len(res.Items))
	}
	if len(res.Meta.Relaxed) != 0 {
		t.Fatalf("did not expect relaxation, got %v", res.Meta.Relaxed)
	}
	if res.Items[0].Reason == "" {
		t.Fatalf("expected a reason tag on picks")
	}
}

func TestPicks_RelaxesWhenTooFew(t *testing.T) {
	// Only return results once the runtime constraint is dropped.
	catalog := &fakeCatalog{itemsByPage: func(p release.DiscoverParams) []release.DiscoverItem {
		if p.RuntimeLTE == 0 && p.Page == 1 {
			return items(10, 11, 12, 13, 14, 15)
		}
		return nil
	}}
	svc := NewService(catalog, nil, nil)

	res, err := svc.Picks(context.Background(), PicksRequest{Answers: standardAnswers(), Count: 6})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(res.Items) != 6 {
		t.Fatalf("got %d picks, want 6 after relaxation", len(res.Items))
	}
	if len(res.Meta.Relaxed) == 0 || res.Meta.Relaxed[0] != "runtime" {
		t.Fatalf("expected runtime relaxation, got %v", res.Meta.Relaxed)
	}
}

func TestPicks_ExcludesProvidedAndSaved(t *testing.T) {
	catalog := &fakeCatalog{itemsByPage: func(p release.DiscoverParams) []release.DiscoverItem {
		if p.Page == 1 {
			return items(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
		}
		return nil
	}}
	saved := &fakeSaved{ids: []int{1, 2}}
	svc := NewService(catalog, saved, nil)

	res, err := svc.Picks(context.Background(), PicksRequest{
		Answers:        standardAnswers(),
		Count:          6,
		ExcludeTMDBIDs: []int{3, 4},
		UserID:         "u1",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	for _, item := range res.Items {
		if item.TMDBID <= 4 {
			t.Fatalf("excluded id %d leaked into picks", item.TMDBID)
		}
	}
}

func TestPicks_InvalidInputs(t *testing.T) {
	svc := NewService(&fakeCatalog{}, nil, nil)
	cases := []struct {
		name string
		req  PicksRequest
	}{
		{"missing mood", PicksRequest{Answers: map[string]string{"time": "short"}}},
		{"invalid option", PicksRequest{Answers: func() map[string]string {
			a := standardAnswers()
			a["mood"] = "nope"
			return a
		}()}},
		{"bad mode", PicksRequest{Mode: "refine", Answers: standardAnswers()}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := svc.Picks(context.Background(), tc.req)
			if !errors.Is(err, ErrInvalidRequest) {
				t.Fatalf("expected ErrInvalidRequest, got %v", err)
			}
		})
	}
}

func TestQuestions_DepthSizes(t *testing.T) {
	// Unconditional path (no branching): quick = mood/region/time/discovery,
	// standard adds era/company. Mood sub-branches are not counted here.
	if got := len(QuestionsForDepth("quick").Items); got != 4 {
		t.Fatalf("quick depth has %d questions, want 4", got)
	}
	if got := len(QuestionsForDepth("standard").Items); got != 6 {
		t.Fatalf("standard depth has %d questions, want 6", got)
	}
	if QuestionsForDepth("garbage").Meta.Depth != DefaultDepth {
		t.Fatalf("unknown depth should fall back to %q", DefaultDepth)
	}
}

func contains(values []int, target int) bool {
	for _, v := range values {
		if v == target {
			return true
		}
	}
	return false
}

func containsAll(values []int, targets ...int) bool {
	for _, t := range targets {
		if !contains(values, t) {
			return false
		}
	}
	return true
}
