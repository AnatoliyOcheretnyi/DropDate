package vibe

import (
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/themes"
)

// Plan is what we understood from a phrase — and, once the user edits the chips
// on screen, what they corrected it to. It is the only thing that turns into a
// query, so every field is validated against a vocabulary before use.
type Plan struct {
	// Phrase is what the user typed. It travels with the plan so an edited plan
	// can still be reranked against the original wording.
	Phrase        string   `json:"phrase,omitempty"`
	Themes        []string `json:"themes"`
	Genres        []string `json:"genres"`
	ExcludeGenres []string `json:"excludeGenres,omitempty"`
	MediaTypes    []string `json:"mediaTypes,omitempty"`
	Countries     []string `json:"countries,omitempty"`
	YearFrom      int      `json:"yearFrom,omitempty"`
	YearTo        int      `json:"yearTo,omitempty"`
	// Summary is the model's one-line read of the phrase, shown above the chips.
	Summary string `json:"summary,omitempty"`
	// Source records how the plan was produced: "ai" or "keywords".
	Source string `json:"source,omitempty"`
}

// PlanLabel is one chip in the "Ми зрозуміли так" panel.
type PlanLabel struct {
	Kind  string `json:"kind"` // theme | genre | country | years | media
	ID    string `json:"id"`
	Label string `json:"label"`
	Emoji string `json:"emoji,omitempty"`
}

const (
	maxPlanThemes = 4
	maxPlanGenres = 3
	minYear       = 1900
	// A film cannot be filtered into next century; anything beyond next year is
	// a model typo rather than an intent.
	yearHorizon = 1
)

// IsEmpty reports that nothing usable was understood.
func (p Plan) IsEmpty() bool {
	return len(p.Themes) == 0 && len(p.Genres) == 0 &&
		len(p.Countries) == 0 && p.YearFrom == 0 && p.YearTo == 0
}

// Normalize drops everything that is not in a vocabulary, caps the list sizes
// and squares away the year range. It is applied both to model output and to
// plans posted back by the client, so an edited plan gets the same treatment.
func (p Plan) Normalize(now time.Time) Plan {
	out := Plan{
		Phrase:  strings.TrimSpace(p.Phrase),
		Summary: strings.TrimSpace(p.Summary),
		Source:  p.Source,
	}

	seenTheme := map[string]bool{}
	for _, id := range p.Themes {
		id = strings.ToLower(strings.TrimSpace(id))
		if id == "" || id == themes.AnyID || seenTheme[id] {
			continue
		}
		if _, ok := themes.ByID(id); !ok {
			continue
		}
		seenTheme[id] = true
		out.Themes = append(out.Themes, id)
		if len(out.Themes) == maxPlanThemes {
			break
		}
	}

	out.Genres = normalizeGenres(p.Genres, maxPlanGenres)
	out.ExcludeGenres = normalizeGenres(p.ExcludeGenres, maxPlanGenres)

	seenCountry := map[string]bool{}
	for _, code := range p.Countries {
		country, ok := countryByCode(code)
		if !ok || seenCountry[country.Code] {
			continue
		}
		seenCountry[country.Code] = true
		out.Countries = append(out.Countries, country.Code)
	}

	for _, media := range p.MediaTypes {
		media = strings.ToLower(strings.TrimSpace(media))
		if media != MediaMovie && media != MediaTV {
			continue
		}
		if !containsString(out.MediaTypes, media) {
			out.MediaTypes = append(out.MediaTypes, media)
		}
	}

	maxYear := now.Year() + yearHorizon
	from, to := clampYear(p.YearFrom, maxYear), clampYear(p.YearTo, maxYear)
	if from > 0 && to > 0 && from > to {
		from, to = to, from
	}
	out.YearFrom, out.YearTo = from, to

	return out
}

func normalizeGenres(values []string, limit int) []string {
	var out []string
	seen := map[string]bool{}
	for _, slug := range values {
		genre, ok := genreBySlug(slug)
		if !ok || seen[genre.Slug] {
			continue
		}
		seen[genre.Slug] = true
		out = append(out, genre.Slug)
		if len(out) == limit {
			break
		}
	}
	return out
}

func clampYear(year, maxYear int) int {
	if year == 0 {
		return 0
	}
	if year < minYear {
		return minYear
	}
	if year > maxYear {
		return maxYear
	}
	return year
}

// Labels renders the plan as the chips shown on screen, in the order they read:
// what it is about, then what kind of film, then where and when.
func (p Plan) Labels() []PlanLabel {
	labels := make([]PlanLabel, 0, len(p.Themes)+len(p.Genres)+len(p.Countries)+1)
	for _, id := range p.Themes {
		if theme, ok := themes.ByID(id); ok {
			labels = append(labels, PlanLabel{
				Kind: "theme", ID: theme.ID, Label: theme.Label, Emoji: theme.Emoji,
			})
		}
	}
	for _, slug := range p.Genres {
		if genre, ok := genreBySlug(slug); ok {
			labels = append(labels, PlanLabel{Kind: "genre", ID: genre.Slug, Label: genre.Label})
		}
	}
	for _, code := range p.Countries {
		if country, ok := countryByCode(code); ok {
			labels = append(labels, PlanLabel{Kind: "country", ID: country.Code, Label: country.Label})
		}
	}
	if label := yearsLabel(p.YearFrom, p.YearTo); label != "" {
		labels = append(labels, PlanLabel{Kind: "years", ID: "years", Label: label})
	}
	return labels
}

func yearsLabel(from, to int) string {
	switch {
	case from > 0 && to > 0 && from == to:
		return strconv.Itoa(from)
	case from > 0 && to > 0:
		return strconv.Itoa(from) + " — " + strconv.Itoa(to)
	case from > 0:
		return "з " + strconv.Itoa(from)
	case to > 0:
		return "до " + strconv.Itoa(to)
	default:
		return ""
	}
}

// wantsMedia reports whether the plan asks for this media type. An empty
// MediaTypes means "both", which is the common case.
func (p Plan) wantsMedia(mediaType string) bool {
	if len(p.MediaTypes) == 0 {
		return true
	}
	return containsString(p.MediaTypes, mediaType)
}

// DiscoverParams turns the plan into one leg of the query.
//
// Keywords from several themes are OR-joined by TMDB, which is the only thing
// it supports for with_keywords — so a two-theme plan is a union of keywords
// sharpened by the AND-ed genres, not a strict intersection of both themes.
// Genres are AND-ed: "молодіжний жах" must be a horror, not a horror or a
// teen film.
func (p Plan) DiscoverParams(mediaType string) (release.DiscoverParams, bool) {
	if !p.wantsMedia(mediaType) {
		return release.DiscoverParams{}, false
	}

	params := release.DiscoverParams{
		MediaType:      mediaType,
		SortBy:         "popularity.desc",
		VoteCountGTE:   voteCountFloor,
		GenresMatchAll: true,
	}

	withGenres := newIntSet()
	withoutGenres := newIntSet()
	for _, slug := range p.Genres {
		genre, ok := genreBySlug(slug)
		if !ok {
			continue
		}
		id := genre.movieID
		if mediaType == MediaTV {
			id = genre.tvID
		}
		if id == 0 {
			// The genre the user asked for does not exist for this media type;
			// running the leg anyway would answer a question nobody asked.
			return release.DiscoverParams{}, false
		}
		withGenres.add(id)
	}
	for _, slug := range p.ExcludeGenres {
		if genre, ok := genreBySlug(slug); ok {
			id := genre.movieID
			if mediaType == MediaTV {
				id = genre.tvID
			}
			if id != 0 {
				withoutGenres.add(id)
			}
		}
	}

	keywords := newIntSet()
	for _, theme := range themes.Pick(p.Themes...) {
		keywords.add(theme.Keywords...)
		// Genre hints are movie ids, so they only sharpen the movie leg.
		if mediaType == MediaMovie {
			withGenres.add(theme.WithGenres...)
			withoutGenres.add(theme.WithoutGenres...)
		}
	}

	for _, id := range withoutGenres.list() {
		withGenres.remove(id)
	}
	params.WithGenres = withGenres.list()
	params.WithoutGenres = withoutGenres.list()
	params.WithKeywords = keywords.list()
	params.WithOriginCountry = append([]string(nil), p.Countries...)

	if p.YearFrom > 0 {
		params.ReleaseDateGTE = strconv.Itoa(p.YearFrom) + "-01-01"
	}
	if p.YearTo > 0 {
		params.ReleaseDateLTE = strconv.Itoa(p.YearTo) + "-12-31"
	}

	// A plan with neither a keyword nor a genre is just "popular titles", which
	// is not an answer to a phrase.
	if len(params.WithKeywords) == 0 && len(params.WithGenres) == 0 &&
		len(params.WithOriginCountry) == 0 {
		return release.DiscoverParams{}, false
	}
	return params, true
}

const voteCountFloor = 50

type intSet struct {
	values map[int]bool
}

func newIntSet() *intSet { return &intSet{values: map[int]bool{}} }

func (s *intSet) add(values ...int) {
	for _, value := range values {
		if value != 0 {
			s.values[value] = true
		}
	}
}

func (s *intSet) remove(value int) { delete(s.values, value) }

func (s *intSet) list() []int {
	if len(s.values) == 0 {
		return nil
	}
	out := make([]int, 0, len(s.values))
	for value := range s.values {
		out = append(out, value)
	}
	sort.Ints(out)
	return out
}

func containsString(values []string, value string) bool {
	for _, existing := range values {
		if existing == value {
			return true
		}
	}
	return false
}
