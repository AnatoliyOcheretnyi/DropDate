package httpapi

import (
	"hash/fnv"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
)

var bridgeCountries = []struct {
	code string
	name string
}{
	{"KR", "Південна Корея"}, {"JP", "Японія"}, {"FR", "Франція"},
	{"IN", "Індія"}, {"ES", "Іспанія"}, {"BR", "Бразилія"},
	{"AR", "Аргентина"}, {"MX", "Мексика"}, {"SE", "Швеція"},
	{"NO", "Норвегія"}, {"TR", "Туреччина"}, {"TH", "Таїланд"},
	{"ID", "Індонезія"}, {"PL", "Польща"}, {"UA", "Україна"},
}

var bridgeGenreIDs = map[string]int{
	"action": 28, "comedy": 35, "drama": 18, "science_fiction": 878,
	"thriller": 53, "adventure": 12, "horror": 27, "romance": 10749,
	"animation": 16, "fantasy": 14, "mystery": 9648, "documentary": 99,
}

type bridgeItem struct {
	TMDBID      int     `json:"tmdbId"`
	MediaType   string  `json:"mediaType"`
	Title       string  `json:"title"`
	Year        string  `json:"year,omitempty"`
	PosterURL   string  `json:"posterUrl,omitempty"`
	Rating      float64 `json:"rating,omitempty"`
	Country     string  `json:"country"`
	CountryCode string  `json:"countryCode"`
	Reason      string  `json:"reason"`
}

func (s *Server) bridgeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.releases == nil {
		writeError(w, http.StatusServiceUnavailable, "bridge unavailable")
		return
	}

	mediaType := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("mediaType")))
	if mediaType != "tv" {
		mediaType = "movie"
	}
	adventure, _ := strconv.Atoi(r.URL.Query().Get("adventure"))
	if adventure < 1 || adventure > 3 {
		adventure = 2
	}
	runtimeLTE, _ := strconv.Atoi(r.URL.Query().Get("runtimeLTE"))

	excluded := map[string]bool{}
	if s.saved != nil {
		rows, loadErr := s.saved.SeedRows(r.Context(), userID)
		if loadErr == nil {
			for _, row := range rows {
				excluded[recKey(row.TMDBID, row.MediaType)] = true
			}
		}
	}

	genreID, genreName := s.bridgeTaste(r, userID)
	countries := rotatedBridgeCountries(userID, adventure)
	items := make([]bridgeItem, 0, 5)
	seen := map[int]bool{}
	for _, country := range countries {
		params := release.DiscoverParams{
			MediaType: mediaType, WithOriginCountry: []string{country.code},
			RuntimeLTE: runtimeLTE, SortBy: "vote_average.desc", VoteAverageGTE: 6.2,
			VoteCountGTE: 40 + (3-adventure)*40,
		}
		if genreID > 0 && adventure < 3 {
			params.WithGenres = []int{genreID}
		}
		results, discoverErr := s.releases.Discover(r.Context(), params)
		if discoverErr != nil {
			s.logger.Printf("bridge discover %s failed: %v", country.code, discoverErr)
			continue
		}
		for _, result := range results {
			if seen[result.TMDBID] || excluded[recKey(result.TMDBID, result.MediaType)] {
				continue
			}
			seen[result.TMDBID] = true
			reason := "Вхід у кіно " + country.name + " через сильний локальний тайтл"
			if genreName != "" {
				reason = "Твоя любов до «" + genreName + "» веде до кіно " + country.name
			}
			items = append(items, bridgeItem{result.TMDBID, result.MediaType, result.Title, result.Year, result.PosterURL, result.Rating, country.name, country.code, reason})
			break
		}
		if len(items) == 5 {
			break
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "adventure": adventure})
}

func (s *Server) bridgeTaste(r *http.Request, userID string) (int, string) {
	if s.taste == nil {
		return 0, ""
	}
	items, err := s.taste.Rankings(r.Context(), userID, "genre")
	if err != nil {
		return 0, ""
	}
	for _, item := range items {
		if item.Comparisons >= 2 {
			return bridgeGenreIDs[item.ID], item.ID
		}
	}
	return 0, ""
}

func rotatedBridgeCountries(userID string, adventure int) []struct{ code, name string } {
	items := append([]struct{ code, name string }(nil), bridgeCountries...)
	h := fnv.New32a()
	_, _ = h.Write([]byte(userID))
	offset := int(h.Sum32()) % len(items)
	items = append(items[offset:], items[:offset]...)
	limit := 6 + adventure*3
	if limit < len(items) {
		items = items[:limit]
	}
	sort.SliceStable(items, func(i, j int) bool { return (i+adventure)%3 < (j+adventure)%3 })
	return items
}
