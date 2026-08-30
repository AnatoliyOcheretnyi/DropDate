package tmdb

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

// DiscoverParams describes a TMDB /discover query. Zero-valued fields are
// omitted from the request. MediaType selects /discover/movie (default) or
// /discover/tv.
type DiscoverParams struct {
	MediaType      string // "movie" (default) or "tv"
	WithGenres     []int  // OR-joined (any of), or AND-joined when GenresMatchAll
	GenresMatchAll bool   // true = a title must carry every genre listed
	WithoutGenres  []int  // excluded
	WithKeywords   []int  // OR-joined (any of) -- the thematic layer
	// WithKeywordGroups AND-es one OR-group against another: a title must carry
	// at least one keyword out of every group. It is how "молодіжний жах де
	// багато крові" asks for teen AND gore rather than teen OR gore. Combined
	// with WithKeywords, which is simply one more group.
	WithKeywordGroups [][]int
	WithoutKeywords   []int    // excluded
	OriginalLanguage  string   // ISO 639-1, e.g. "ja", "ko", "en"
	WithOriginCountry []string // ISO 3166-1, OR-joined (any of), e.g. ["KR","JP"]
	RuntimeLTE        int      // 0 = unset
	RuntimeGTE        int      // 0 = unset
	ReleaseDateGTE    string   // "YYYY-MM-DD", "" = unset
	ReleaseDateLTE    string   // "YYYY-MM-DD", "" = unset
	SortBy            string   // default "popularity.desc"
	VoteCountGTE      int      // 0 = unset
	VoteAverageGTE    float64  // 0 = unset
	CertificationLTE  string   // movie only, e.g. "PG-13"
	CertCountry       string   // movie only, e.g. "US"
	WithType          string   // tv only, e.g. "2" (miniseries), "4" (scripted)
	WithStatus        string   // tv only, e.g. "0" (returning), "3" (ended)
	Page              int      // 1-based; 0 -> 1
}

// DiscoverItem is one /discover result, enriched with the fields the pickers
// need (rating and genre ids) on top of the basic suggestion shape.
type DiscoverItem struct {
	ID        int
	MediaType string
	Title     string
	Year      string
	PosterURL string
	Rating    float64
	GenreIDs  []int
	Overview  string
}

type discoverResponse struct {
	Results []discoverEntry `json:"results"`
}

type discoverEntry struct {
	ID           int     `json:"id"`
	Title        string  `json:"title"`
	Name         string  `json:"name"`
	ReleaseDate  string  `json:"release_date"`
	FirstAirDate string  `json:"first_air_date"`
	PosterPath   string  `json:"poster_path"`
	VoteAverage  float64 `json:"vote_average"`
	GenreIDs     []int   `json:"genre_ids"`
	Overview     string  `json:"overview"`
}

// Discover queries TMDB /discover/{movie,tv} with the given filters.
func (c *Client) Discover(ctx context.Context, p DiscoverParams) ([]DiscoverItem, error) {
	mediaType := p.MediaType
	if mediaType != "tv" {
		mediaType = "movie"
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		fmt.Sprintf("%s/discover/%s", c.baseURL, mediaType),
		nil,
	)
	if err != nil {
		return nil, err
	}

	q := req.URL.Query()
	q.Set("language", "uk-UA")
	q.Set("include_adult", "false")

	if len(p.WithGenres) > 0 {
		// TMDB reads "," as AND and "|" as OR inside with_genres.
		separator := "|"
		if p.GenresMatchAll {
			separator = ","
		}
		q.Set("with_genres", joinInts(p.WithGenres, separator))
	}
	if len(p.WithoutGenres) > 0 {
		q.Set("without_genres", joinInts(p.WithoutGenres, ","))
	}
	// TMDB reads "," as AND and "|" as OR inside with_keywords too, so groups
	// of alternatives are joined with "|" and the groups themselves with ",".
	if groups := keywordGroups(p); len(groups) > 0 {
		parts := make([]string, 0, len(groups))
		for _, group := range groups {
			parts = append(parts, joinInts(group, "|"))
		}
		q.Set("with_keywords", strings.Join(parts, ","))
	}
	if len(p.WithoutKeywords) > 0 {
		q.Set("without_keywords", joinInts(p.WithoutKeywords, ","))
	}
	if p.OriginalLanguage != "" {
		q.Set("with_original_language", p.OriginalLanguage)
	}
	if len(p.WithOriginCountry) > 0 {
		q.Set("with_origin_country", strings.Join(p.WithOriginCountry, "|"))
	}
	if p.RuntimeLTE > 0 {
		q.Set("with_runtime.lte", strconv.Itoa(p.RuntimeLTE))
	}
	if p.RuntimeGTE > 0 {
		q.Set("with_runtime.gte", strconv.Itoa(p.RuntimeGTE))
	}
	if p.ReleaseDateGTE != "" {
		if mediaType == "tv" {
			q.Set("first_air_date.gte", p.ReleaseDateGTE)
		} else {
			q.Set("primary_release_date.gte", p.ReleaseDateGTE)
		}
	}
	if p.ReleaseDateLTE != "" {
		if mediaType == "tv" {
			q.Set("first_air_date.lte", p.ReleaseDateLTE)
		} else {
			q.Set("primary_release_date.lte", p.ReleaseDateLTE)
		}
	}
	if p.VoteCountGTE > 0 {
		q.Set("vote_count.gte", strconv.Itoa(p.VoteCountGTE))
	}
	if p.VoteAverageGTE > 0 {
		q.Set("vote_average.gte", strconv.FormatFloat(p.VoteAverageGTE, 'f', -1, 64))
	}
	if mediaType == "movie" && p.CertificationLTE != "" && p.CertCountry != "" {
		q.Set("certification_country", p.CertCountry)
		q.Set("certification.lte", p.CertificationLTE)
	}
	if mediaType == "tv" && p.WithType != "" {
		q.Set("with_type", p.WithType)
	}
	if mediaType == "tv" && p.WithStatus != "" {
		q.Set("with_status", p.WithStatus)
	}
	sortBy := p.SortBy
	if sortBy == "" {
		sortBy = "popularity.desc"
	}
	q.Set("sort_by", sortBy)
	page := p.Page
	if page < 1 {
		page = 1
	}
	q.Set("page", strconv.Itoa(page))
	req.URL.RawQuery = q.Encode()

	var payload discoverResponse
	if err := c.do(req, &payload); err != nil {
		return nil, err
	}

	out := make([]DiscoverItem, 0, len(payload.Results))
	for _, result := range payload.Results {
		title := result.Title
		if title == "" {
			title = result.Name
		}
		if title == "" {
			continue
		}
		date := result.ReleaseDate
		if date == "" {
			date = result.FirstAirDate
		}
		poster := ""
		if result.PosterPath != "" {
			poster = buildPosterURL(result.PosterPath)
		}
		out = append(out, DiscoverItem{
			ID:        result.ID,
			MediaType: mediaType,
			Title:     title,
			Year:      yearFromDate(date),
			PosterURL: poster,
			Rating:    result.VoteAverage,
			GenreIDs:  result.GenreIDs,
			Overview:  strings.TrimSpace(result.Overview),
		})
	}
	return out, nil
}

// keywordGroups returns every AND-ed group of the query: the flat WithKeywords
// list counts as one, empty groups are dropped.
func keywordGroups(p DiscoverParams) [][]int {
	groups := make([][]int, 0, len(p.WithKeywordGroups)+1)
	if len(p.WithKeywords) > 0 {
		groups = append(groups, p.WithKeywords)
	}
	for _, group := range p.WithKeywordGroups {
		if len(group) > 0 {
			groups = append(groups, group)
		}
	}
	return groups
}

func joinInts(values []int, sep string) string {
	parts := make([]string, 0, len(values))
	for _, v := range values {
		parts = append(parts, strconv.Itoa(v))
	}
	return strings.Join(parts, sep)
}
