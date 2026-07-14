package httpapi

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
)

// discoverMovieGenreIDs maps a taste-chip genre slug to its TMDB movie genre id.
var discoverMovieGenreIDs = map[string]int{
	"action":    28,
	"comedy":    35,
	"drama":     18,
	"scifi":     878,
	"horror":    27,
	"thriller":  53,
	"romance":   10749,
	"adventure": 12,
	"animation": 16,
	"fantasy":   14,
	"crime":     80,
	"docs":      99,
}

// discoverTVGenreIDs maps a taste-chip genre slug to its TMDB tv genre id.
// TMDB's tv genre list has no Horror/Thriller/Romance bucket, so those slugs
// are intentionally absent here — the tv leg of the query is skipped when a
// requested genre has no tv mapping (see discoverHandler).
var discoverTVGenreIDs = map[string]int{
	"action":    10759, // Action & Adventure
	"comedy":    35,
	"drama":     18,
	"scifi":     10765, // Sci-Fi & Fantasy
	"adventure": 10759,
	"animation": 16,
	"fantasy":   10765,
	"crime":     80,
	"docs":      99,
}

// discoverCountryCodes maps a taste-chip country slug to its ISO 3166-1 code.
var discoverCountryCodes = map[string]string{
	"us": "US",
	"gb": "GB",
	"kr": "KR",
	"jp": "JP",
	"ua": "UA",
	"fr": "FR",
	"es": "ES",
	"in": "IN",
}

const discoverVoteCountFloor = 100

func (s *Server) discoverHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	genreSlugs := splitCSV(r.URL.Query().Get("genres"))
	countrySlugs := splitCSV(r.URL.Query().Get("countries"))
	if len(genreSlugs) == 0 && len(countrySlugs) == 0 {
		writeError(w, http.StatusBadRequest, "genres or countries is required")
		return
	}

	page := 1
	if pageStr := strings.TrimSpace(r.URL.Query().Get("page")); pageStr != "" {
		if parsed, err := strconv.Atoi(pageStr); err == nil && parsed > 0 {
			page = parsed
		}
	}

	var movieGenres, tvGenres []int
	for _, slug := range genreSlugs {
		if id, ok := discoverMovieGenreIDs[slug]; ok {
			movieGenres = append(movieGenres, id)
		}
		if id, ok := discoverTVGenreIDs[slug]; ok {
			tvGenres = append(tvGenres, id)
		}
	}

	var countries []string
	for _, slug := range countrySlugs {
		if code, ok := discoverCountryCodes[slug]; ok {
			countries = append(countries, code)
		}
	}

	if len(movieGenres) == 0 && len(tvGenres) == 0 && len(countries) == 0 {
		writeError(w, http.StatusBadRequest, "no known genres or countries given")
		return
	}

	movies, err := s.releases.Discover(r.Context(), release.DiscoverParams{
		MediaType:         "movie",
		WithGenres:        movieGenres,
		WithOriginCountry: countries,
		SortBy:            "popularity.desc",
		VoteCountGTE:      discoverVoteCountFloor,
		Page:              page,
	})
	if err != nil {
		s.logger.Printf("discover movies failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch discover results")
		return
	}

	// Skip the tv leg only when genres were requested but none of them have a
	// tv equivalent — otherwise an unfiltered tv list would ignore the genre
	// the user actually picked.
	var series []release.DiscoverItem
	if len(genreSlugs) == 0 || len(tvGenres) > 0 {
		series, err = s.releases.Discover(r.Context(), release.DiscoverParams{
			MediaType:         "tv",
			WithGenres:        tvGenres,
			WithOriginCountry: countries,
			SortBy:            "popularity.desc",
			VoteCountGTE:      discoverVoteCountFloor,
			Page:              page,
		})
		if err != nil {
			s.logger.Printf("discover series failed: %v", err)
			writeError(w, http.StatusInternalServerError, "failed to fetch discover results")
			return
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"results": mixDiscoverItems(movies, series),
		"page":    page,
		"hasMore": len(movies) >= 20 || len(series) >= 20,
	})
}

func splitCSV(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			out = append(out, part)
		}
	}
	return out
}

func discoverItemToSuggestion(item release.DiscoverItem) release.Suggestion {
	return release.Suggestion{
		ID:        item.TMDBID,
		Title:     item.Title,
		MediaType: item.MediaType,
		Year:      item.Year,
		PosterURL: item.PosterURL,
	}
}

// mixDiscoverItems interleaves movie and tv results (movie, tv, movie, tv, ...)
// into the shared Suggestion shape the frontend already knows how to render.
func mixDiscoverItems(movies, series []release.DiscoverItem) []release.Suggestion {
	max := len(movies)
	if len(series) > max {
		max = len(series)
	}
	out := make([]release.Suggestion, 0, len(movies)+len(series))
	for i := 0; i < max; i++ {
		if i < len(movies) {
			out = append(out, discoverItemToSuggestion(movies[i]))
		}
		if i < len(series) {
			out = append(out, discoverItemToSuggestion(series[i]))
		}
	}
	return out
}
