package httpapi

import (
	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"net/http"
	"sync"
	"time"
)

func (s *Server) newReleasesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	if s.releases == nil {
		writeError(w, 503, "releases unavailable")
		return
	}
	types := []string{"movie", "tv", "movie"}
	results := make([][]release.Suggestion, 3)
	errs := make([]error, 3)
	var wg sync.WaitGroup
	for i, media := range types {
		wg.Add(1)
		go func(i int, media string) {
			defer wg.Done()
			p := release.DiscoverParams{MediaType: media, ReleaseDateGTE: time.Now().AddDate(0, -3, 0).Format("2006-01-02"), ReleaseDateLTE: time.Now().Format("2006-01-02"), SortBy: "popularity.desc", VoteCountGTE: 5}
			if i == 2 {
				p.WithGenres = []int{16}
				p.WithOriginCountry = []string{"JP"}
			}
			items, e := s.cachedDiscover(r.Context(), p)
			errs[i] = e
			results[i] = []release.Suggestion{}
			for _, v := range items {
				results[i] = append(results[i], release.Suggestion{ID: v.TMDBID, Title: v.Title, MediaType: v.MediaType, Year: v.Year, PosterURL: v.PosterURL})
			}
		}(i, media)
	}
	wg.Wait()
	if errs[0] != nil && errs[1] != nil {
		writeError(w, 502, "new releases unavailable")
		return
	}
	writeJSON(w, 200, map[string]any{"movies": results[0], "series": results[1], "anime": results[2]})
}
