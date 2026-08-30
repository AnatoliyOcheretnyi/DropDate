package vibe

import (
	"bytes"
	"encoding/json"
	"testing"
	"time"
)

var now = time.Date(2026, 8, 28, 12, 0, 0, 0, time.UTC)

func TestNormalizeDropsAnythingOutsideTheVocabulary(t *testing.T) {
	plan := Plan{
		Themes:    []string{"slasher", "totally-made-up", "coming_of_age"},
		Genres:    []string{"horror", "not-a-genre"},
		Countries: []string{"US", "ZZ"},
	}.Normalize(now)

	if len(plan.Themes) != 2 || plan.Themes[0] != "slasher" {
		t.Fatalf("themes = %v, want the two real ones", plan.Themes)
	}
	if len(plan.Genres) != 1 || plan.Genres[0] != "horror" {
		t.Fatalf("genres = %v, want only horror", plan.Genres)
	}
	if len(plan.Countries) != 1 || plan.Countries[0] != "US" {
		t.Fatalf("countries = %v, want only US", plan.Countries)
	}
}

// The wire contract says themes and genres are arrays. A nil slice marshals to
// `null`, and a client reading `plan.genres.includes(...)` off a themes-only
// plan crashes on it — so they must never be nil.
func TestNormalizeNeverLeavesTheListsNil(t *testing.T) {
	for _, plan := range []Plan{
		{Themes: []string{"erotica"}},
		{Genres: []string{"horror"}},
		{},
	} {
		normalized := plan.Normalize(now)
		encoded, err := json.Marshal(normalized)
		if err != nil {
			t.Fatalf("marshal: %v", err)
		}
		if bytes.Contains(encoded, []byte("null")) {
			t.Fatalf("plan %+v encoded as %s, want empty lists", plan, encoded)
		}
	}
}

func TestNormalizeSquaresAwayTheYearRange(t *testing.T) {
	plan := Plan{YearFrom: 2026, YearTo: 2015}.Normalize(now)
	if plan.YearFrom != 2015 || plan.YearTo != 2026 {
		t.Fatalf("years = %d..%d, want them swapped into order", plan.YearFrom, plan.YearTo)
	}

	// A model typo must not filter titles into the next century.
	plan = Plan{YearFrom: 1700, YearTo: 3000}.Normalize(now)
	if plan.YearFrom != 1900 || plan.YearTo != 2027 {
		t.Fatalf("years = %d..%d, want them clamped", plan.YearFrom, plan.YearTo)
	}
}

func TestDiscoverParamsAndsGenresAndOrsKeywords(t *testing.T) {
	plan := Plan{Themes: []string{"slasher"}, Genres: []string{"horror"}}.Normalize(now)

	params, ok := plan.DiscoverParams(MediaMovie, MatchBroad)
	if !ok {
		t.Fatal("expected a movie leg")
	}
	if !params.GenresMatchAll {
		t.Fatal("genres must be AND-ed: a teen horror is a horror, not a horror or a teen film")
	}
	if len(params.WithKeywordGroups) == 0 {
		t.Fatal("the theme must contribute its TMDB keywords")
	}
	if !containsInt(params.WithGenres, 27) {
		t.Fatalf("with_genres = %v, want the horror id", params.WithGenres)
	}
}

func TestDiscoverParamsSkipsTheTVLegWhenTheGenreHasNoTVBucket(t *testing.T) {
	// TMDB has no Horror genre for series, so a tv leg would answer a different
	// question — better to return movies only.
	plan := Plan{Genres: []string{"horror"}, Themes: []string{"slasher"}}.Normalize(now)
	if _, ok := plan.DiscoverParams(MediaTV, MatchBroad); ok {
		t.Fatal("expected the tv leg to be skipped")
	}

	plan = Plan{Genres: []string{"comedy"}, Themes: []string{"haunted"}}.Normalize(now)
	if _, ok := plan.DiscoverParams(MediaTV, MatchBroad); !ok {
		t.Fatal("comedy exists for tv, so the leg should run")
	}
}

func TestDiscoverParamsRefusesAnEmptyQuery(t *testing.T) {
	// Nothing but a sort order is "popular titles", not an answer to a phrase.
	if _, ok := (Plan{}).DiscoverParams(MediaMovie, MatchBroad); ok {
		t.Fatal("an empty plan must not produce a query")
	}
}

func TestDiscoverParamsRespectsMediaTypeAndYears(t *testing.T) {
	plan := Plan{
		Genres:     []string{"comedy"},
		MediaTypes: []string{"tv"},
		YearFrom:   2015,
		YearTo:     2020,
	}.Normalize(now)

	if _, ok := plan.DiscoverParams(MediaMovie, MatchBroad); ok {
		t.Fatal("a tv-only plan must not run the movie leg")
	}
	params, ok := plan.DiscoverParams(MediaTV, MatchBroad)
	if !ok {
		t.Fatal("expected the tv leg")
	}
	if params.ReleaseDateGTE != "2015-01-01" || params.ReleaseDateLTE != "2020-12-31" {
		t.Fatalf("dates = %q..%q", params.ReleaseDateGTE, params.ReleaseDateLTE)
	}
}

func TestMatchStrictAndsThemesWhileBroadOrsThem(t *testing.T) {
	plan := Plan{Themes: []string{"teen_comedy", "slasher"}}.Normalize(now)

	strict, ok := plan.DiscoverParams(MediaMovie, MatchStrict)
	if !ok {
		t.Fatal("expected a movie leg")
	}
	if len(strict.WithKeywordGroups) != 2 {
		t.Fatalf(
			"groups = %v, want one per theme so a title must carry both",
			strict.WithKeywordGroups,
		)
	}

	broad, ok := plan.DiscoverParams(MediaMovie, MatchBroad)
	if !ok {
		t.Fatal("expected a movie leg")
	}
	if len(broad.WithKeywordGroups) != 1 {
		t.Fatalf("groups = %v, want the themes pooled into one", broad.WithKeywordGroups)
	}
	if len(broad.WithKeywordGroups[0]) <= len(strict.WithKeywordGroups[0]) {
		t.Fatal("the broad pool must hold every theme's keywords")
	}

	// One theme reads the same either way, so there is nothing to widen to.
	if (Plan{Themes: []string{"slasher"}}).Normalize(now).narrows() {
		t.Fatal("a single-theme plan must not cost a second query")
	}
}

func TestLabelsReadAsTheChipsOnScreen(t *testing.T) {
	plan := Plan{
		Themes:    []string{"slasher"},
		Genres:    []string{"horror"},
		Countries: []string{"KR"},
		YearFrom:  2015,
		YearTo:    2026,
	}.Normalize(now)

	labels := plan.Labels()
	if len(labels) != 4 {
		t.Fatalf("labels = %v, want theme + genre + country + years", labels)
	}
	if labels[0].Kind != "theme" || labels[0].Emoji == "" {
		t.Fatalf("the theme should lead and carry its emoji: %+v", labels[0])
	}
	if labels[3].Label != "2015 — 2026" {
		t.Fatalf("years label = %q", labels[3].Label)
	}
}

func containsInt(values []int, value int) bool {
	for _, existing := range values {
		if existing == value {
			return true
		}
	}
	return false
}
