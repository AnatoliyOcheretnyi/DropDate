package cinematch

import (
	"sort"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/themes"
)

// resolveParams folds the accumulated answers into a single /discover query for
// the chosen media type. Unanswered questions contribute nothing.
func resolveParams(answers map[string]string) release.DiscoverParams {
	media := answers["media"]
	if media != "tv" {
		media = "movie"
	}

	p := release.DiscoverParams{MediaType: media}
	genres := newIntSet()
	without := newIntSet()

	if g := genresFor(media, answers["genre"]); len(g) > 0 {
		genres.add(g...)
	}
	if id, ok := noteGenre(media, answers["note"]); ok {
		genres.add(id)
	}

	// The theme adds TMDB keywords -- the thematic layer above genres. Its genre
	// hints are MOVIE genre ids, so they are applied only to movie queries; TV
	// uses a different genre vocabulary and would silently match the wrong ones.
	if theme, ok := themes.ByID(answers[themeQuestionID]); ok {
		p.WithKeywords = theme.Keywords
		if media == "movie" {
			genres.add(theme.WithGenres...)
			without.add(theme.WithoutGenres...)
		}
	}

	switch answers["origin"] {
	case "hollywood":
		p.OriginalLanguage = "en"
	case "anime":
		p.OriginalLanguage = "ja"
		genres.add(animationGenre(media))
	case "dorama":
		p.OriginalLanguage = "ko"
	}

	switch answers["era"] {
	case "fresh":
		p.ReleaseDateGTE = "2018-01-01"
	case "tens":
		p.ReleaseDateGTE = "2010-01-01"
		p.ReleaseDateLTE = "2019-12-31"
	case "modern":
		p.ReleaseDateGTE = "2000-01-01"
		p.ReleaseDateLTE = "2009-12-31"
	case "classic":
		p.ReleaseDateLTE = "1999-12-31"
	}

	serious := false
	switch answers["tone"] {
	case "light":
		genres.add(comedyGenre(media))
		if media == "movie" {
			without.add(mvHorror, mvWar)
		}
	case "serious":
		genres.add(dramaGenre(media))
		serious = true
	}

	if answers["rating"] == "high" {
		p.VoteAverageGTE = 7.5
	}

	sortBy := "popularity.desc"
	voteFloor := 150
	switch answers["popularity"] {
	case "popular":
		voteFloor = 300
	case "hidden":
		sortBy = "vote_average.desc"
		voteFloor = 100
	case "any":
		voteFloor = 100
	}
	// Reliable averages need enough votes.
	if (serious || answers["rating"] == "high") && voteFloor < 200 {
		voteFloor = 200
	}
	p.SortBy = sortBy
	p.VoteCountGTE = voteFloor

	if media == "movie" {
		switch answers["length"] {
		case "short":
			p.RuntimeLTE = 95
		case "standard":
			p.RuntimeGTE = 90
			p.RuntimeLTE = 140
		case "long":
			p.RuntimeGTE = 150
		}
		switch answers["audience"] {
		case "family":
			p.CertCountry = "US"
			p.CertificationLTE = "PG-13"
			genres.add(familyGenre(media))
		case "adult":
			without.add(familyGenre(media), animationGenre(media))
		}
	} else {
		switch answers["format"] {
		case "mini":
			p.WithType = "2"
		case "multi":
			p.WithType = "4"
		}
		switch answers["status"] {
		case "ongoing":
			p.WithStatus = "0"
		case "ended":
			p.WithStatus = "3"
		}
	}

	for _, g := range without.list() {
		genres.remove(g)
	}
	p.WithGenres = genres.list()
	p.WithoutGenres = without.list()
	return p
}

func reasonFor(answers map[string]string) string {
	// The theme is the most specific answer, so it names the pick when present.
	if theme, ok := themes.ByID(answers[themeQuestionID]); ok {
		return theme.Label
	}
	if label := optionLabel("genre", answers["genre"]); label != "" && answers["genre"] != "any" {
		return label
	}
	if label := optionLabel("origin", answers["origin"]); label != "" && answers["origin"] != "any" {
		return label
	}
	return ""
}

type intSet struct{ seen map[int]bool }

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
