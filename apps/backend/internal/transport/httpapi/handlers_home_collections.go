package httpapi

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/discoverydata"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/saved"
)

type homeCollectionItem struct {
	release.Suggestion
	Reason   string  `json:"reason"`
	Date     string  `json:"releaseDate,omitempty"`
	Rating   float64 `json:"rating,omitempty"`
	PersonID int     `json:"personId,omitempty"`
	Country  string  `json:"country,omitempty"`
}

type homeCollection struct {
	Items              []homeCollectionItem `json:"items"`
	Partial            bool                 `json:"partial"`
	Country            string               `json:"country,omitempty"`
	CountryName        string               `json:"countryName,omitempty"`
	PassportIncomplete bool                 `json:"passportIncomplete,omitempty"`
}

func hasHomeList(row saved.Title, kinds ...string) bool {
	for _, kind := range kinds {
		for _, value := range row.ListTypes {
			if kind == value {
				return true
			}
		}
	}
	return false
}

func homeSeen(rows []saved.Title) map[int]bool {
	seen := map[int]bool{}
	for _, row := range passportMovies(rows) {
		seen[row.TMDBID] = true
	}
	return seen
}

// Deduplicate memberships before sampling the strongest, most recent taste signals.
func homeSeeds(rows []saved.Title) []saved.Title {
	byID := map[int]saved.Title{}
	weight := func(row saved.Title) int {
		if hasHomeList(row, "disliked") {
			return -1
		}
		if hasHomeList(row, "favorite") {
			return 3
		}
		if hasHomeList(row, "liked") {
			return 2
		}
		if hasHomeList(row, "watched") && row.UserRating != nil && *row.UserRating >= 8 {
			return 1
		}
		return 0
	}
	negative := map[int]bool{}
	for _, row := range rows {
		if row.MediaType != "movie" || row.TMDBID <= 0 {
			continue
		}
		if weight(row) < 0 {
			negative[row.TMDBID] = true
		}
		old, ok := byID[row.TMDBID]
		if weight(row) > 0 && (!ok || weight(row) > weight(old)) {
			byID[row.TMDBID] = row
		}
	}
	out := []saved.Title{}
	for id, row := range byID {
		if !negative[id] {
			out = append(out, row)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if weight(out[i]) != weight(out[j]) {
			return weight(out[i]) > weight(out[j])
		}
		if !out[i].UpdatedAt.Equal(out[j].UpdatedAt) {
			return out[i].UpdatedAt.After(out[j].UpdatedAt)
		}
		return out[i].TMDBID < out[j].TMDBID
	})
	return out[:min(12, len(out))]
}

// Fixed workers keep large passports bounded. Failed metadata is not interpreted
// as an unvisited country or an unreleased film.
func (s *Server) homeDetails(ctx context.Context, ids []int) (map[int]release.Details, bool) {
	out := map[int]release.Details{}
	var mu sync.Mutex
	var wg sync.WaitGroup
	jobs := make(chan int)
	for i := 0; i < min(6, len(ids)); i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for id := range jobs {
				d, err := s.discoveryDetails(ctx, id, "movie")
				if err == nil {
					mu.Lock()
					out[id] = d
					mu.Unlock()
				}
			}
		}()
	}
	for _, id := range ids {
		select {
		case jobs <- id:
		case <-ctx.Done():
		}
	}
	close(jobs)
	wg.Wait()
	return out, len(out) != len(ids)
}

func homeReleased(date string, now time.Time) bool {
	d, err := time.Parse("2006-01-02", date)
	return err == nil && !d.After(now)
}

func homeDetailItem(d release.Details, reason string) homeCollectionItem {
	year := ""
	if len(d.ReleaseDate) >= 4 {
		year = d.ReleaseDate[:4]
	}
	return homeCollectionItem{Suggestion: release.Suggestion{ID: d.ID, MediaType: "movie", Title: d.Title, Year: year, PosterURL: d.PosterURL}, Reason: reason, Date: d.ReleaseDate, Rating: d.VoteAverage}
}

func (s *Server) homeCollectionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, 401, "unauthorized")
		return
	}
	kind := r.URL.Query().Get("kind")
	if kind != "released" && kind != "gems" && kind != "country" && kind != "people" {
		writeError(w, 400, "invalid collection")
		return
	}
	if s.saved == nil || s.releases == nil {
		writeError(w, 503, "collections unavailable")
		return
	}
	rows, err := s.saved.SeedRows(r.Context(), userID)
	if err != nil {
		writeError(w, 503, "library unavailable")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 25*time.Second)
	defer cancel()
	result := homeCollection{Items: []homeCollectionItem{}}
	seen := homeSeen(rows)
	if kind == "released" {
		ids, unique := []int{}, map[int]bool{}
		for _, row := range rows {
			if row.MediaType == "movie" && row.TMDBID > 0 && !seen[row.TMDBID] && !unique[row.TMDBID] && hasHomeList(row, "follow", "watchlist") {
				ids = append(ids, row.TMDBID)
				unique[row.TMDBID] = true
			}
		}
		details, partial := s.homeDetails(ctx, ids)
		result.Partial = partial
		for _, d := range details {
			if homeReleased(d.ReleaseDate, time.Now()) {
				result.Items = append(result.Items, homeDetailItem(d, "Із твоїх «Хочу» та підписок · прем’єра відбулася"))
			}
		}
		sort.Slice(result.Items, func(i, j int) bool {
			if result.Items[i].Date != result.Items[j].Date {
				return result.Items[i].Date > result.Items[j].Date
			}
			return result.Items[i].ID < result.Items[j].ID
		})
	} else {
		seeds := homeSeeds(rows)
		ids := []int{}
		for _, seed := range seeds {
			ids = append(ids, seed.TMDBID)
		}
		details, partial := s.homeDetails(ctx, ids)
		result.Partial = partial
		switch kind {
		case "people":
			s.homePeople(ctx, userID, seeds, details, seen, &result)
		case "gems", "country":
			s.homeExplore(ctx, kind, rows, seeds, details, seen, &result)
		}
	}
	if len(result.Items) > 12 {
		result.Items = result.Items[:12]
	}
	w.Header().Set("Cache-Control", "private, no-store")
	// Preserve the distinction between a legitimate empty collection and failure.
	if result.Partial && len(result.Items) == 0 {
		writeError(w, 503, "Не вдалося зібрати добірку. Спробуй ще раз.")
		return
	}
	writeJSON(w, 200, result)
}

func (s *Server) homeExplore(ctx context.Context, kind string, rows, seeds []saved.Title, details map[int]release.Details, seen map[int]bool, result *homeCollection) {
	preferred := map[string]int{}
	for _, seed := range seeds {
		genres := details[seed.TMDBID].Genres
		if len(genres) == 0 {
			genres = seed.Genres
		}
		for _, g := range genres {
			preferred[g]++
		}
	}
	if len(preferred) == 0 {
		return
	}
	params := release.DiscoverParams{MediaType: "movie", SortBy: "vote_average.desc", VoteCountGTE: 50, VoteAverageGTE: 7, ReleaseDateLTE: time.Now().Format("2006-01-02"), Page: 1}
	if kind == "gems" {
		params.VoteCountLTE = 2000
	}
	if kind == "country" {
		ids := []int{}
		for id := range seen {
			ids = append(ids, id)
		}
		watched, partial := s.homeDetails(ctx, ids)
		result.PassportIncomplete = partial
		if len(ids) > 0 && len(watched) == 0 {
			result.Partial = true
			return
		}
		visited := map[string]bool{}
		for _, d := range watched {
			if len(d.OriginCountry) == 0 {
				result.PassportIncomplete = true
			}
			for _, country := range d.OriginCountry {
				visited[country] = true
			}
		}
		// Rotate daily. The response explicitly identifies an incomplete passport,
		// so the UI qualifies the claim instead of hiding the entire discovery rail.
		countries := []string{"JP", "KR", "FR", "IT", "ES", "IN", "IR", "DK", "SE", "BR", "AR", "MX", "PL", "CZ", "TR", "TW", "HK", "UA", "KZ", "DE", "NO", "FI", "TH", "ID", "RO", "HU", "GR", "PT", "AU", "NZ"}
		start := time.Now().YearDay() % len(countries)
		rest := []string{}
		known := map[string]bool{}
		for _, country := range countries {
			known[country] = true
		}
		for country := range discoverydata.Countries {
			if !known[country] {
				rest = append(rest, country)
			}
		}
		sort.Strings(rest)
		countries = append(append(countries[start:], countries[:start]...), rest...)
		for i := 0; i < len(countries); i++ {
			country := countries[i]
			if !visited[country] {
				params.WithOriginCountry = []string{country}
				break
			}
		}
		if len(params.WithOriginCountry) == 0 {
			return
		}
		result.Country = params.WithOriginCountry[0]
		result.CountryName = discoverydata.Countries[result.Country].Name
		params.VoteCountGTE = 10
		params.VoteAverageGTE = 6.5
	}
	pool := []release.DiscoverItem{}
	for page := 1; page <= 2; page++ {
		params.Page = page
		items, err := s.cachedDiscover(ctx, params)
		if err != nil {
			result.Partial = true
			continue
		}
		pool = append(pool, items...)
	}
	ids, unique := []int{}, map[int]bool{}
	for _, item := range pool {
		if !seen[item.TMDBID] && !unique[item.TMDBID] {
			ids = append(ids, item.TMDBID)
			unique[item.TMDBID] = true
		}
	}
	candidates, partial := s.homeDetails(ctx, ids)
	result.Partial = result.Partial || partial
	scores := map[int]float64{}
	for _, id := range ids {
		d, ok := candidates[id]
		if !ok || !homeReleased(d.ReleaseDate, time.Now()) {
			continue
		}
		if kind == "gems" && (d.VoteCount < 50 || d.VoteCount > 2000 || d.VoteAverage < 7) {
			continue
		}
		if kind == "country" {
			matches := false
			for _, c := range d.OriginCountry {
				if c == result.Country {
					matches = true
				}
			}
			if !matches {
				continue
			}
		}
		match, strength := "", 0
		for _, g := range d.Genres {
			if preferred[g] > strength {
				match, strength = g, preferred[g]
			}
		}
		if strength == 0 {
			continue
		}
		reason := "Тобі подобається жанр «" + match + "»"
		if kind == "country" {
			reason = result.CountryName + " · " + reason
		}
		item := homeDetailItem(d, reason)
		item.Country = result.Country
		result.Items = append(result.Items, item)
		scores[id] = float64(strength) + worldQuality(release.DiscoverItem{Rating: d.VoteAverage, VoteCount: d.VoteCount})
	}
	sort.SliceStable(result.Items, func(i, j int) bool { return scores[result.Items[i].ID] > scores[result.Items[j].ID] })
}

type homePerson struct {
	id                 int
	name, role, reason string
	weight             int
}

func (s *Server) homePeople(ctx context.Context, userID string, seeds []saved.Title, details map[int]release.Details, seen map[int]bool, result *homeCollection) {
	people := map[string]homePerson{}
	add := func(id int, name, role, reason string, weight int) {
		if id <= 0 || (role != "actor" && role != "director") {
			return
		}
		key := fmt.Sprintf("%d:%s", id, role)
		p := people[key]
		p.id, p.name, p.role = id, name, role
		if p.reason == "" || weight >= 100 {
			p.reason = reason
		}
		p.weight += weight
		people[key] = p
	}
	if s.people != nil {
		follows, err := s.people.List(ctx, userID)
		if err != nil {
			result.Partial = true
		}
		for _, p := range follows {
			if p.Liked || p.Subscribed {
				add(p.PersonID, p.Name, p.Role, "З твоїх улюблених митців", 100)
			}
		}
	}
	for _, seed := range seeds {
		d := details[seed.TMDBID]
		for _, p := range d.Directors {
			add(p.TMDBID, p.Name, "director", "Тобі подобається «"+seed.Title+"»", 3)
		}
		for i, p := range d.Cast {
			if i >= 3 {
				break
			}
			add(p.TMDBID, p.Name, "actor", "Тобі подобається «"+seed.Title+"»", 1)
		}
	}
	ranked := []homePerson{}
	for _, p := range people {
		ranked = append(ranked, p)
	}
	sort.Slice(ranked, func(i, j int) bool {
		if ranked[i].weight != ranked[j].weight {
			return ranked[i].weight > ranked[j].weight
		}
		if ranked[i].id != ranked[j].id {
			return ranked[i].id < ranked[j].id
		}
		return ranked[i].role < ranked[j].role
	})
	// Keep actors and directors represented even when directors have stronger signals.
	chosen, roleCount := []homePerson{}, map[string]int{}
	for _, p := range ranked {
		if roleCount[p.role] < 3 {
			chosen = append(chosen, p)
			roleCount[p.role]++
		}
	}
	unique := map[int]bool{}
	for _, p := range chosen {
		person, err := s.releases.Person(ctx, p.id)
		if err != nil {
			result.Partial = true
			continue
		}
		credits := append([]release.PersonCredit(nil), person.Credits...)
		sort.SliceStable(credits, func(i, j int) bool { return credits[i].Popularity > credits[j].Popularity })
		count := 0
		for _, c := range credits {
			if c.MediaType != "movie" || c.Role != p.role || seen[c.TMDBID] || unique[c.TMDBID] || !homeReleased(c.ReleaseDate, time.Now()) {
				continue
			}
			role := "У ролях: "
			if p.role == "director" {
				role = "Режисер: "
			}
			result.Items = append(result.Items, homeCollectionItem{Suggestion: release.Suggestion{ID: c.TMDBID, Title: c.Title, MediaType: "movie", Year: c.Year, PosterURL: c.PosterURL}, PersonID: p.id, Reason: strings.TrimSpace(role+p.name) + " · " + p.reason, Rating: c.VoteAverage})
			unique[c.TMDBID] = true
			count++
			if count == 2 {
				break
			}
		}
	}
}
