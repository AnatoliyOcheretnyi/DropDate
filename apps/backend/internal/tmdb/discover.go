package tmdb

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

// DiscoverParams describes a TMDB /discover/movie query. Zero-valued fields are
// omitted from the request.
type DiscoverParams struct {
	WithGenres       []int  // OR-joined (any of)
	WithoutGenres    []int  // excluded
	RuntimeLTE       int    // 0 = unset
	RuntimeGTE       int    // 0 = unset
	ReleaseDateGTE   string // "YYYY-MM-DD", "" = unset
	ReleaseDateLTE   string // "YYYY-MM-DD", "" = unset
	SortBy           string // default "popularity.desc"
	VoteCountGTE     int    // 0 = unset
	CertificationLTE string // e.g. "PG-13"
	CertCountry      string // e.g. "US"
	Page             int    // 1-based; 0 -> 1
}

// DiscoverItem is one /discover result, enriched with the fields the mood picker
// needs (rating and genre ids) on top of the basic suggestion shape.
type DiscoverItem struct {
	ID        int
	Title     string
	Year      string
	PosterURL string
	Rating    float64
	GenreIDs  []int
}

type discoverResponse struct {
	Results []discoverEntry `json:"results"`
}

type discoverEntry struct {
	ID          int     `json:"id"`
	Title       string  `json:"title"`
	ReleaseDate string  `json:"release_date"`
	PosterPath  string  `json:"poster_path"`
	VoteAverage float64 `json:"vote_average"`
	GenreIDs    []int   `json:"genre_ids"`
}

// Discover queries TMDB /discover/movie with the given filters.
func (c *Client) Discover(ctx context.Context, p DiscoverParams) ([]DiscoverItem, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fmt.Sprintf("%s/discover/movie", c.baseURL), nil)
	if err != nil {
		return nil, err
	}

	q := req.URL.Query()
	q.Set("language", "uk-UA")
	q.Set("include_adult", "false")

	if len(p.WithGenres) > 0 {
		q.Set("with_genres", joinInts(p.WithGenres, "|"))
	}
	if len(p.WithoutGenres) > 0 {
		q.Set("without_genres", joinInts(p.WithoutGenres, ","))
	}
	if p.RuntimeLTE > 0 {
		q.Set("with_runtime.lte", strconv.Itoa(p.RuntimeLTE))
	}
	if p.RuntimeGTE > 0 {
		q.Set("with_runtime.gte", strconv.Itoa(p.RuntimeGTE))
	}
	if p.ReleaseDateGTE != "" {
		q.Set("primary_release_date.gte", p.ReleaseDateGTE)
	}
	if p.ReleaseDateLTE != "" {
		q.Set("primary_release_date.lte", p.ReleaseDateLTE)
	}
	if p.VoteCountGTE > 0 {
		q.Set("vote_count.gte", strconv.Itoa(p.VoteCountGTE))
	}
	if p.CertificationLTE != "" && p.CertCountry != "" {
		q.Set("certification_country", p.CertCountry)
		q.Set("certification.lte", p.CertificationLTE)
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
		if result.Title == "" {
			continue
		}
		poster := ""
		if result.PosterPath != "" {
			poster = buildPosterURL(result.PosterPath)
		}
		out = append(out, DiscoverItem{
			ID:        result.ID,
			Title:     result.Title,
			Year:      yearFromDate(result.ReleaseDate),
			PosterURL: poster,
			Rating:    result.VoteAverage,
			GenreIDs:  result.GenreIDs,
		})
	}
	return out, nil
}

func joinInts(values []int, sep string) string {
	parts := make([]string, 0, len(values))
	for _, v := range values {
		parts = append(parts, strconv.Itoa(v))
	}
	return strings.Join(parts, sep)
}
