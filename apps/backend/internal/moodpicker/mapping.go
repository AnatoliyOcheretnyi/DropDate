package moodpicker

import (
	"sort"
	"strings"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
)

// resolveParams folds the guided answers into a single /discover query.
// "without_genres" always wins over "with_genres" for the same genre.
func resolveParams(answers map[string]string) release.DiscoverParams {
	with := newIntSet()
	without := newIntSet()
	var p release.DiscoverParams

	// Discovery sets the sort and the quality floor (never below 150).
	switch answers["discovery"] {
	case "hidden":
		p.SortBy = "vote_average.desc"
		p.VoteCountGTE = 150
	default: // popular / unset
		p.SortBy = "popularity.desc"
		p.VoteCountGTE = 300
	}

	switch answers["mood"] {
	case "lift":
		with.add(genreComedy, genreFamily, genreMusic)
		without.add(genreHorror, genreWar)
	case "cry":
		with.add(genreDrama, genreRomance)
	case "adrenaline":
		with.add(genreAction, genreThriller, genreAdventure)
	case "think":
		with.add(genreDrama, genreMystery, genreScienceFiction, genreHistory)
	case "cozy":
		with.add(genreRomance, genreComedy, genreFamily, genreFantasy)
		without.add(genreHorror)
	case "scary":
		with.add(genreHorror, genreThriller, genreMystery)
	}

	// Company genre additions are soft (append only). family is the exception:
	// it hard-excludes and applies a certification cap.
	switch answers["company"] {
	case "friends":
		with.add(genreComedy, genreAction)
	case "couple":
		with.add(genreRomance, genreDrama)
	case "family":
		with.add(genreFamily)
		without.add(genreHorror, genreThriller, genreWar)
		p.CertCountry = "US"
		p.CertificationLTE = "PG-13"
	}

	switch answers["time"] {
	case "short":
		p.RuntimeLTE = 95
	case "standard":
		p.RuntimeGTE = 90
		p.RuntimeLTE = 150
	}

	switch answers["era"] {
	case "fresh":
		p.ReleaseDateGTE = "2018-01-01"
	case "modern":
		p.ReleaseDateGTE = "2000-01-01"
	case "classic":
		p.ReleaseDateLTE = "1999-12-31"
	}

	// Conflict resolution: exclusions win over inclusions.
	for _, g := range without.list() {
		with.remove(g)
	}
	p.WithGenres = with.list()
	p.WithoutGenres = without.list()
	return p
}

// reasonFor builds a short tag explaining a pick, derived from the answers.
func reasonFor(answers map[string]string) string {
	parts := make([]string, 0, 3)
	if label := optionLabel("mood", answers["mood"]); label != "" {
		parts = append(parts, label)
	}
	if answers["time"] == "short" {
		parts = append(parts, "до 90 хв")
	}
	if answers["discovery"] == "hidden" {
		parts = append(parts, "перлина")
	}
	return strings.Join(parts, " · ")
}

// intSet is a small ordered-unique int set with a stable, sorted output.
type intSet struct {
	seen map[int]bool
}

func newIntSet() *intSet { return &intSet{seen: map[int]bool{}} }

func (s *intSet) add(values ...int) {
	for _, v := range values {
		s.seen[v] = true
	}
}

func (s *intSet) remove(v int) { delete(s.seen, v) }

func (s *intSet) list() []int {
	out := make([]int, 0, len(s.seen))
	for v := range s.seen {
		out = append(out, v)
	}
	sort.Ints(out)
	return out
}
