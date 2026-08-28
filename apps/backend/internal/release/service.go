package release

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"
)

const (
	defaultCacheTTL = 30 * time.Minute
	cacheVersion    = "v2"
)

// Info описує наступний реліз фільму або серіалу.
type Info struct {
	Title       string    `json:"title"`
	Type        string    `json:"type"`
	NextRelease time.Time `json:"nextRelease"`
	Source      string    `json:"source"`
	PosterURL   string    `json:"posterUrl,omitempty"`
	BackdropURL string    `json:"backdropUrl,omitempty"`
	Status      string    `json:"status"`
}

// Suggestion describes minimal search result.
type Suggestion struct {
	ID        int    `json:"id"`
	Title     string `json:"title"`
	MediaType string `json:"mediaType"`
	Year      string `json:"year,omitempty"`
	PosterURL string `json:"posterUrl,omitempty"`
}

type SearchResults struct {
	Results      []Suggestion `json:"results"`
	Page         int          `json:"page"`
	TotalPages   int          `json:"totalPages"`
	TotalResults int          `json:"totalResults"`
}

type Details struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	MediaType   string `json:"mediaType"`
	Overview    string `json:"overview,omitempty"`
	Tagline     string `json:"tagline,omitempty"`
	PosterURL   string `json:"posterUrl,omitempty"`
	BackdropURL string `json:"backdropUrl,omitempty"`
	// BackdropLargeURL is the untouched TMDB upload, for full-bleed surfaces
	// like the home hero where the w780 variant visibly falls apart.
	BackdropLargeURL  string                       `json:"backdropLargeUrl,omitempty"`
	Status            string                       `json:"status,omitempty"`
	ReleaseDate       string                       `json:"releaseDate,omitempty"`
	FirstAirDate      string                       `json:"firstAirDate,omitempty"`
	LastAirDate       string                       `json:"lastAirDate,omitempty"`
	NextAirDate       string                       `json:"nextAirDate,omitempty"`
	NextEpisode       string                       `json:"nextEpisodeName,omitempty"`
	NextEpisodeSeason int                          `json:"nextEpisodeSeason,omitempty"`
	NextEpisodeNumber int                          `json:"nextEpisodeNumber,omitempty"`
	LastEpisode       string                       `json:"lastEpisodeName,omitempty"`
	LastEpisodeSeason int                          `json:"lastEpisodeSeason,omitempty"`
	LastEpisodeNumber int                          `json:"lastEpisodeNumber,omitempty"`
	SeasonCount       int                          `json:"seasonCount,omitempty"`
	Seasons           []Season                     `json:"seasons,omitempty"`
	EpisodeCount      int                          `json:"episodeCount,omitempty"`
	Runtime           int                          `json:"runtime,omitempty"`
	Genres            []string                     `json:"genres,omitempty"`
	Networks          []string                     `json:"networks,omitempty"`
	VoteAverage       float64                      `json:"voteAverage,omitempty"`
	VoteCount         int                          `json:"voteCount,omitempty"`
	Popularity        float64                      `json:"popularity,omitempty"`
	Homepage          string                       `json:"homepage,omitempty"`
	OriginCountry     []string                     `json:"originCountry,omitempty"`
	Cast              []CastMember                 `json:"cast,omitempty"`
	Directors         []CrewMember                 `json:"directors,omitempty"`
	WatchProviders    map[string]WatchAvailability `json:"watchProviders,omitempty"`
}
type Season struct {
	SeasonNumber int    `json:"seasonNumber"`
	Name         string `json:"name"`
	EpisodeCount int    `json:"episodeCount"`
	AirDate      string `json:"airDate,omitempty"`
}

type WatchProvider struct {
	ID      int    `json:"id"`
	Name    string `json:"name"`
	LogoURL string `json:"logoUrl,omitempty"`
}

type WatchAvailability struct {
	Link   string          `json:"link,omitempty"`
	Stream []WatchProvider `json:"stream,omitempty"`
	Free   []WatchProvider `json:"free,omitempty"`
	Rent   []WatchProvider `json:"rent,omitempty"`
	Buy    []WatchProvider `json:"buy,omitempty"`
}

// CastMember is one billed actor on a title.
type CastMember struct {
	TMDBID     int    `json:"tmdbId"`
	Name       string `json:"name"`
	Character  string `json:"character,omitempty"`
	ProfileURL string `json:"profileUrl,omitempty"`
}

// CrewMember is a key crew credit (director for movies, creator for series).
type CrewMember struct {
	TMDBID     int    `json:"tmdbId"`
	Name       string `json:"name"`
	Job        string `json:"job,omitempty"`
	ProfileURL string `json:"profileUrl,omitempty"`
}

var (
	// ErrNotFound повертаємо, коли користувач питає про невідомий тайтл.
	ErrNotFound = errors.New("release not found")
)

// Service об'єднує кілька провайдерів релізів і (опційно) провайдера підказок.
type Service struct {
	providers      []ReleaseProvider
	suggester      SuggestionProvider
	trending       TrendingProvider
	trendingByType TrendingByTypeProvider
	popular        PopularProvider
	topRated       TopRatedProvider
	upcoming       UpcomingProvider
	searcher       SearchProvider
	details        DetailsProvider
	person         PersonProvider
	discover       DiscoverProvider
	seasons        SeasonProvider
	logger         *log.Logger

	cache    map[string]cacheEntry
	cacheMu  sync.RWMutex
	cacheTTL time.Duration
}

// LookupHint описує додаткові підказки для пошуку.
type LookupHint struct {
	TMDBID    int
	MediaType string
}

// TrendingProvider повертає список популярних тайтлів (TMDB).
type TrendingProvider interface {
	Trending(ctx context.Context, window string, limit int) ([]Suggestion, error)
}

// TrendingByTypeProvider повертає популярні тайтли за типом.
type TrendingByTypeProvider interface {
	TrendingByType(ctx context.Context, mediaType string, window string, limit int) ([]Suggestion, error)
}

// PopularProvider повертає популярні тайтли за типом.
type PopularProvider interface {
	Popular(ctx context.Context, mediaType string, limit int) ([]Suggestion, error)
}

// TopRatedProvider повертає тайтли з найвищим рейтингом за типом.
type TopRatedProvider interface {
	TopRated(ctx context.Context, mediaType string, limit int) ([]Suggestion, error)
}

// UpcomingProvider повертає найближчі релізи за типом.
type UpcomingProvider interface {
	Upcoming(ctx context.Context, mediaType string, limit int) ([]Suggestion, error)
}

// SearchProvider повертає повний список для пошуку з пагінацією.
type SearchProvider interface {
	Search(ctx context.Context, query string, page int) (SearchResults, error)
}

type DetailsProvider interface {
	Details(ctx context.Context, id int, mediaType string) (Details, error)
	Recommendations(ctx context.Context, id int, mediaType string, limit int) ([]Suggestion, error)
}

type Episode struct {
	EpisodeNumber int     `json:"episodeNumber"`
	Name          string  `json:"name"`
	Overview      string  `json:"overview,omitempty"`
	AirDate       string  `json:"airDate,omitempty"`
	Runtime       int     `json:"runtime,omitempty"`
	StillURL      string  `json:"stillUrl,omitempty"`
	VoteAverage   float64 `json:"voteAverage,omitempty"`
}

type SeasonProvider interface {
	SeasonEpisodes(context.Context, int, int) ([]Episode, error)
}

// DiscoverParams mirrors tmdb.DiscoverParams so callers depend on release, not tmdb.
type DiscoverParams struct {
	MediaType         string
	WithGenres        []int
	GenresMatchAll    bool
	WithoutGenres     []int
	WithKeywords      []int
	WithoutKeywords   []int
	OriginalLanguage  string
	WithOriginCountry []string
	RuntimeLTE        int
	RuntimeGTE        int
	ReleaseDateGTE    string
	ReleaseDateLTE    string
	SortBy            string
	VoteCountGTE      int
	VoteAverageGTE    float64
	CertificationLTE  string
	CertCountry       string
	WithType          string
	WithStatus        string
	Page              int
}

// DiscoverItem is a discover result enriched with rating and genre ids.
type DiscoverItem struct {
	TMDBID    int     `json:"tmdbId"`
	Title     string  `json:"title"`
	MediaType string  `json:"mediaType"`
	Year      string  `json:"year,omitempty"`
	PosterURL string  `json:"posterUrl,omitempty"`
	Rating    float64 `json:"rating,omitempty"`
	GenreIDs  []int   `json:"genreIds,omitempty"`
	// Overview is what the title is about — the reranker reads it, the client
	// does not, so it stays out of the JSON the frontend receives.
	Overview string `json:"-"`
}

// DiscoverProvider runs TMDB /discover queries for movies.
type DiscoverProvider interface {
	Discover(ctx context.Context, p DiscoverParams) ([]DiscoverItem, error)
}

type cacheEntry struct {
	info    Info
	expires time.Time
}

// NewService приймає провайдерів як залежності.
func NewService(providers []ReleaseProvider, suggester SuggestionProvider, logger *log.Logger) *Service {
	if logger == nil {
		logger = log.Default()
	}
	cleanProviders := make([]ReleaseProvider, 0, len(providers))
	for _, provider := range providers {
		if provider != nil {
			cleanProviders = append(cleanProviders, provider)
		}
	}
	return &Service{
		providers: cleanProviders,
		suggester: suggester,
		trending: func() TrendingProvider {
			if t, ok := suggester.(TrendingProvider); ok {
				return t
			}
			return nil
		}(),
		trendingByType: func() TrendingByTypeProvider {
			if t, ok := suggester.(TrendingByTypeProvider); ok {
				return t
			}
			return nil
		}(),
		popular: func() PopularProvider {
			if p, ok := suggester.(PopularProvider); ok {
				return p
			}
			return nil
		}(),
		topRated: func() TopRatedProvider {
			if t, ok := suggester.(TopRatedProvider); ok {
				return t
			}
			return nil
		}(),
		upcoming: func() UpcomingProvider {
			if u, ok := suggester.(UpcomingProvider); ok {
				return u
			}
			return nil
		}(),
		searcher: func() SearchProvider {
			if s, ok := suggester.(SearchProvider); ok {
				return s
			}
			return nil
		}(),
		details: func() DetailsProvider {
			if d, ok := suggester.(DetailsProvider); ok {
				return d
			}
			return nil
		}(),
		person: func() PersonProvider {
			if p, ok := suggester.(PersonProvider); ok {
				return p
			}
			return nil
		}(),
		discover: func() DiscoverProvider {
			if d, ok := suggester.(DiscoverProvider); ok {
				return d
			}
			return nil
		}(),
		seasons: func() SeasonProvider {
			if p, ok := suggester.(SeasonProvider); ok {
				return p
			}
			return nil
		}(),
		logger:   logger,
		cache:    make(map[string]cacheEntry),
		cacheTTL: defaultCacheTTL,
	}
}

func (s *Service) SeasonEpisodes(ctx context.Context, tvID, seasonNumber int) ([]Episode, error) {
	if s.seasons == nil {
		return nil, errors.New("season metadata unavailable")
	}
	return s.seasons.SeasonEpisodes(ctx, tvID, seasonNumber)
}

// NextRelease витягує дані з TVMaze і мапить у нашу структуру.
func (s *Service) NextRelease(ctx context.Context, title string, hint *LookupHint) (Info, error) {
	start := time.Now()
	key := s.cacheKey(title, hint)
	if info, ok := s.lookupCache(key); ok {
		s.logf("cache hit for %q (took %s)", title, time.Since(start))
		return info, nil
	}

	if hint != nil && hint.TMDBID > 0 {
		if info, err := s.lookupByHint(ctx, title, hint); err == nil {
			s.saveCache(key, info)
			s.logf("tmdb direct hit for %q (took %s)", title, time.Since(start))
			return info, nil
		} else if errors.Is(err, ErrNotFound) {
			s.logf("tmdb direct miss for %q (hint id=%d), falling back to providers", title, hint.TMDBID)
		} else {
			return Info{}, err
		}
	}

	for _, provider := range s.providers {
		s.logf("%s lookup for %q", provider.Name(), title)
		info, err := provider.NextRelease(ctx, title)
		if err == nil {
			s.logf("%s hit: title=%q type=%s next=%s poster=%t backdrop=%t",
				provider.Name(),
				info.Title,
				info.Type,
				info.NextRelease.Format(time.RFC3339),
				info.PosterURL != "",
				info.BackdropURL != "",
			)
			s.saveCache(key, info)
			s.logf("%s response for %q took %s", provider.Name(), title, time.Since(start))
			return info, nil
		}
		if errors.Is(err, ErrNotFound) {
			s.logf("%s miss for %q", provider.Name(), title)
			continue
		}
		s.logf("%s error for %q: %v", provider.Name(), title, err)
		return Info{}, err
	}

	s.logf("no releases found for %q (took %s)", title, time.Since(start))
	return Info{}, ErrNotFound
}

func (s *Service) logf(format string, args ...any) {
	if s.logger != nil {
		s.logger.Printf(format, args...)
	}
}

// Suggestions returns lightweight TMDB matches.
func (s *Service) Suggestions(ctx context.Context, query string, limit int) ([]Suggestion, error) {
	if s.suggester == nil {
		return []Suggestion{}, nil
	}

	return s.suggester.Suggestions(ctx, query, limit)
}

// Trending повертає популярні тайтли з TMDB.
func (s *Service) Trending(ctx context.Context, window string, limit int) ([]Suggestion, error) {
	if s.trending == nil {
		return []Suggestion{}, nil
	}
	return s.trending.Trending(ctx, window, limit)
}

func (s *Service) TrendingByType(
	ctx context.Context,
	mediaType string,
	window string,
	limit int,
) ([]Suggestion, error) {
	if s.trendingByType == nil {
		return []Suggestion{}, nil
	}
	return s.trendingByType.TrendingByType(ctx, mediaType, window, limit)
}

// Popular повертає популярні тайтли з TMDB.
func (s *Service) Popular(ctx context.Context, mediaType string, limit int) ([]Suggestion, error) {
	if s.popular == nil {
		return []Suggestion{}, nil
	}
	return s.popular.Popular(ctx, mediaType, limit)
}

// Discover повертає фільми з TMDB /discover за заданими фільтрами.
func (s *Service) Discover(ctx context.Context, p DiscoverParams) ([]DiscoverItem, error) {
	if s.discover == nil {
		return []DiscoverItem{}, nil
	}
	return s.discover.Discover(ctx, p)
}

// TopRated повертає тайтли з найвищим рейтингом.
func (s *Service) TopRated(ctx context.Context, mediaType string, limit int) ([]Suggestion, error) {
	if s.topRated == nil {
		return []Suggestion{}, nil
	}
	return s.topRated.TopRated(ctx, mediaType, limit)
}

// Upcoming повертає найближчі релізи за типом.
func (s *Service) Upcoming(ctx context.Context, mediaType string, limit int) ([]Suggestion, error) {
	if s.upcoming == nil {
		return []Suggestion{}, nil
	}
	if limit <= 0 {
		limit = 18
	}
	listLimit := limit * 4
	if listLimit > 80 {
		listLimit = 80
	}
	results, err := s.upcoming.Upcoming(ctx, mediaType, listLimit)
	if err != nil {
		return nil, err
	}
	if s.details == nil {
		if len(results) > limit {
			return results[:limit], nil
		}
		return results, nil
	}

	out := make([]Suggestion, 0, limit)
	now := time.Now()
	startToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	for _, item := range results {
		if len(out) >= limit {
			break
		}
		details, err := s.details.Details(ctx, item.ID, mediaType)
		if err != nil {
			continue
		}
		dateSource := ""
		if mediaType == "movie" {
			dateSource = details.ReleaseDate
		} else {
			// For TV, prefer next episode date (upcoming season start), fallback to first air date.
			dateSource = details.NextAirDate
			if dateSource == "" {
				dateSource = details.FirstAirDate
			}
			// Exclude shows where the new season has already started.
			if details.LastEpisodeSeason > 0 && details.NextEpisodeSeason > 0 {
				if details.NextEpisodeSeason == details.LastEpisodeSeason {
					continue
				}
			}
		}
		if dateSource == "" {
			// Keep if release date missing to avoid empty upcoming lists.
			out = append(out, item)
			continue
		}
		parsed, err := time.Parse("2006-01-02", dateSource)
		if err != nil {
			out = append(out, item)
			continue
		}
		if !parsed.Before(startToday) {
			out = append(out, item)
		}
	}
	return out, nil
}

// HomeUpcoming returns a curated "coming soon" feed for the homepage. Unlike
// raw TMDB upcoming endpoints, it intentionally mixes several origin-country
// buckets so the rail is not dominated by one market.
func (s *Service) HomeUpcoming(ctx context.Context, limit int) ([]Suggestion, []Suggestion, error) {
	limit = clampHomeUpcomingLimit(limit)
	if s.discover == nil {
		movies, err := s.Upcoming(ctx, "movie", limit)
		if err != nil {
			return nil, nil, err
		}
		series, err := s.Upcoming(ctx, "tv", limit)
		if err != nil {
			return nil, nil, err
		}
		return movies, series, nil
	}

	now := time.Now().UTC()
	windowStart := now.Format(time.DateOnly)
	windowEnd := now.AddDate(1, 0, 0).Format(time.DateOnly)

	movieBuckets := s.fetchUpcomingBuckets(ctx, []DiscoverParams{
		{MediaType: "movie", ReleaseDateGTE: windowStart, ReleaseDateLTE: windowEnd, SortBy: "popularity.desc", VoteCountGTE: 10, VoteAverageGTE: 4.8},
		{MediaType: "movie", WithOriginCountry: []string{"US"}, ReleaseDateGTE: windowStart, ReleaseDateLTE: windowEnd, SortBy: "popularity.desc", VoteCountGTE: 120, VoteAverageGTE: 5.8},
		{MediaType: "movie", WithOriginCountry: []string{"GB"}, ReleaseDateGTE: windowStart, ReleaseDateLTE: windowEnd, SortBy: "popularity.desc", VoteCountGTE: 50, VoteAverageGTE: 5.8},
		{MediaType: "movie", WithOriginCountry: []string{"JP"}, ReleaseDateGTE: windowStart, ReleaseDateLTE: windowEnd, SortBy: "popularity.desc", VoteCountGTE: 25, VoteAverageGTE: 5.5},
		{MediaType: "movie", WithOriginCountry: []string{"KR"}, ReleaseDateGTE: windowStart, ReleaseDateLTE: windowEnd, SortBy: "popularity.desc", VoteCountGTE: 25, VoteAverageGTE: 5.5},
		{MediaType: "movie", WithOriginCountry: []string{"FR"}, ReleaseDateGTE: windowStart, ReleaseDateLTE: windowEnd, SortBy: "popularity.desc", VoteCountGTE: 20, VoteAverageGTE: 5.4},
		{MediaType: "movie", WithOriginCountry: []string{"ES"}, ReleaseDateGTE: windowStart, ReleaseDateLTE: windowEnd, SortBy: "popularity.desc", VoteCountGTE: 18, VoteAverageGTE: 5.4},
		{MediaType: "movie", WithOriginCountry: []string{"IN"}, ReleaseDateGTE: windowStart, ReleaseDateLTE: windowEnd, SortBy: "popularity.desc", VoteCountGTE: 25, VoteAverageGTE: 5.3},
	}, limit)
	seriesBuckets := s.fetchUpcomingBuckets(ctx, []DiscoverParams{
		{MediaType: "tv", ReleaseDateGTE: windowStart, ReleaseDateLTE: windowEnd, SortBy: "popularity.desc", VoteCountGTE: 8, VoteAverageGTE: 4.8},
		{MediaType: "tv", WithOriginCountry: []string{"US"}, ReleaseDateGTE: windowStart, ReleaseDateLTE: windowEnd, SortBy: "popularity.desc", VoteCountGTE: 80, VoteAverageGTE: 5.8},
		{MediaType: "tv", WithOriginCountry: []string{"GB"}, ReleaseDateGTE: windowStart, ReleaseDateLTE: windowEnd, SortBy: "popularity.desc", VoteCountGTE: 35, VoteAverageGTE: 5.6},
		{MediaType: "tv", WithOriginCountry: []string{"JP"}, ReleaseDateGTE: windowStart, ReleaseDateLTE: windowEnd, SortBy: "popularity.desc", VoteCountGTE: 15, VoteAverageGTE: 5.3},
		{MediaType: "tv", WithOriginCountry: []string{"KR"}, ReleaseDateGTE: windowStart, ReleaseDateLTE: windowEnd, SortBy: "popularity.desc", VoteCountGTE: 15, VoteAverageGTE: 5.3},
	}, limit)

	movies := interleaveDiscoverBuckets(movieBuckets, limit)
	seriesLimit := limit
	if seriesLimit > 8 {
		seriesLimit = 8
	}
	series := interleaveDiscoverBuckets(seriesBuckets, seriesLimit)

	if len(movies) < limit && s.upcoming != nil {
		fallback, err := s.Upcoming(ctx, "movie", limit)
		if err == nil {
			movies = mergeSuggestionsUnique(movies, fallback, limit)
		}
	}
	if len(series) < seriesLimit && s.upcoming != nil {
		fallback, err := s.Upcoming(ctx, "tv", seriesLimit)
		if err == nil {
			series = mergeSuggestionsUnique(series, fallback, seriesLimit)
		}
	}
	if len(movies) < limit {
		movies = s.supplementFutureSuggestions(ctx, movies, "movie", limit)
	}
	if len(series) < seriesLimit {
		series = s.supplementFutureSuggestions(ctx, series, "tv", seriesLimit)
	}

	return movies, series, nil
}

func (s *Service) supplementFutureSuggestions(
	ctx context.Context,
	base []Suggestion,
	mediaType string,
	limit int,
) []Suggestion {
	if len(base) >= limit || s.details == nil {
		return base
	}

	candidates := make([]Suggestion, 0, limit*6)
	nowUTC := time.Now().UTC()
	windowStart := nowUTC.Format(time.DateOnly)
	windowEnd := nowUTC.AddDate(1, 0, 0).Format(time.DateOnly)

	if s.discover != nil {
		for page := 1; page <= 3 && len(candidates) < limit*4; page++ {
			items, err := s.discover.Discover(ctx, DiscoverParams{
				MediaType:      mediaType,
				ReleaseDateGTE: windowStart,
				ReleaseDateLTE: windowEnd,
				SortBy:         "popularity.desc",
				VoteCountGTE:   0,
				VoteAverageGTE: 0,
				Page:           page,
			})
			if err != nil {
				continue
			}
			for _, item := range items {
				candidates = append(candidates, Suggestion{
					ID:        item.TMDBID,
					Title:     item.Title,
					MediaType: item.MediaType,
					Year:      item.Year,
					PosterURL: item.PosterURL,
				})
			}
		}
	}

	if s.popular != nil {
		if items, err := s.popular.Popular(ctx, mediaType, limit*3); err == nil {
			candidates = append(candidates, items...)
		}
	}
	if len(candidates) < limit*5 && s.topRated != nil {
		if items, err := s.topRated.TopRated(ctx, mediaType, limit*3); err == nil {
			candidates = append(candidates, items...)
		}
	}

	out := append([]Suggestion(nil), base...)
	seen := make(map[string]bool, len(out))
	for _, item := range out {
		seen[fmt.Sprintf("%s:%d", item.MediaType, item.ID)] = true
	}

	now := time.Now()
	startToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	for _, item := range candidates {
		if len(out) >= limit {
			break
		}
		key := fmt.Sprintf("%s:%d", item.MediaType, item.ID)
		if seen[key] {
			continue
		}
		details, err := s.details.Details(ctx, item.ID, mediaType)
		if err != nil {
			continue
		}
		if !isFutureTitle(details, mediaType, startToday) {
			continue
		}
		seen[key] = true
		out = append(out, item)
	}

	return out
}

func isFutureTitle(details Details, mediaType string, startToday time.Time) bool {
	dateSource := ""
	if mediaType == "movie" {
		dateSource = details.ReleaseDate
	} else {
		dateSource = details.NextAirDate
		if dateSource == "" {
			dateSource = details.FirstAirDate
		}
		if details.LastEpisodeSeason > 0 && details.NextEpisodeSeason > 0 && details.NextEpisodeSeason == details.LastEpisodeSeason {
			return false
		}
	}
	if dateSource == "" {
		return false
	}
	parsed, err := time.Parse("2006-01-02", dateSource)
	if err != nil {
		return false
	}
	return !parsed.Before(startToday)
}

func (s *Service) fetchUpcomingBuckets(ctx context.Context, params []DiscoverParams, limit int) [][]DiscoverItem {
	buckets := make([][]DiscoverItem, 0, len(params))
	perBucket := limit
	if perBucket < 6 {
		perBucket = 6
	}
	for _, p := range params {
		items, err := s.discover.Discover(ctx, p)
		if err != nil {
			continue
		}
		if len(items) > perBucket {
			items = items[:perBucket]
		}
		buckets = append(buckets, items)
	}
	return buckets
}

func interleaveDiscoverBuckets(buckets [][]DiscoverItem, limit int) []Suggestion {
	out := make([]Suggestion, 0, limit)
	seen := make(map[string]bool, limit)
	for round := 0; len(out) < limit; round++ {
		added := false
		for _, bucket := range buckets {
			if round >= len(bucket) {
				continue
			}
			item := bucket[round]
			key := fmt.Sprintf("%s:%d", item.MediaType, item.TMDBID)
			if seen[key] {
				continue
			}
			seen[key] = true
			out = append(out, Suggestion{
				ID:        item.TMDBID,
				Title:     item.Title,
				MediaType: item.MediaType,
				Year:      item.Year,
				PosterURL: item.PosterURL,
			})
			added = true
			if len(out) >= limit {
				break
			}
		}
		if !added {
			break
		}
	}
	return out
}

func mergeSuggestionsUnique(base []Suggestion, extra []Suggestion, limit int) []Suggestion {
	out := append([]Suggestion(nil), base...)
	seen := make(map[string]bool, len(out))
	for _, item := range out {
		seen[fmt.Sprintf("%s:%d", item.MediaType, item.ID)] = true
	}
	for _, item := range extra {
		if len(out) >= limit {
			break
		}
		key := fmt.Sprintf("%s:%d", item.MediaType, item.ID)
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, item)
	}
	return out
}

func clampHomeUpcomingLimit(limit int) int {
	if limit <= 0 {
		return 18
	}
	if limit > 24 {
		return 24
	}
	return limit
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func (s *Service) Search(ctx context.Context, query string, page int) (SearchResults, error) {
	if s.searcher == nil {
		return SearchResults{Results: []Suggestion{}, Page: page}, nil
	}
	return s.searcher.Search(ctx, query, page)
}

func (s *Service) Details(ctx context.Context, id int, mediaType string) (Details, error) {
	if s.details == nil {
		return Details{}, ErrNotFound
	}
	return s.details.Details(ctx, id, mediaType)
}

func (s *Service) Recommendations(
	ctx context.Context,
	id int,
	mediaType string,
	limit int,
) ([]Suggestion, error) {
	if s.details == nil {
		return []Suggestion{}, nil
	}
	return s.details.Recommendations(ctx, id, mediaType, limit)
}

func (s *Service) cacheKey(title string, hint *LookupHint) string {
	base := strings.ToLower(strings.TrimSpace(title))
	if hint != nil && hint.TMDBID > 0 {
		return fmt.Sprintf("%s#tmdb:%d:%s#%s", base, hint.TMDBID, hint.MediaType, cacheVersion)
	}
	if base == "" {
		return ""
	}
	return fmt.Sprintf("%s#%s", base, cacheVersion)
}

func (s *Service) lookupCache(key string) (Info, bool) {
	if key == "" {
		return Info{}, false
	}
	s.cacheMu.RLock()
	entry, ok := s.cache[key]
	s.cacheMu.RUnlock()
	if !ok || time.Now().After(entry.expires) {
		if ok {
			s.cacheMu.Lock()
			delete(s.cache, key)
			s.cacheMu.Unlock()
		}
		return Info{}, false
	}
	return entry.info, true
}

func (s *Service) saveCache(key string, info Info) {
	if key == "" || s.cacheTTL <= 0 {
		return
	}
	s.cacheMu.Lock()
	s.cache[key] = cacheEntry{
		info:    info,
		expires: time.Now().Add(s.cacheTTL),
	}
	s.cacheMu.Unlock()
}

func (s *Service) ClearCache() {
	s.cacheMu.Lock()
	s.cache = make(map[string]cacheEntry)
	s.cacheMu.Unlock()
}

func (s *Service) lookupByHint(ctx context.Context, title string, hint *LookupHint) (Info, error) {
	if hint == nil || hint.TMDBID <= 0 {
		return Info{}, ErrNotFound
	}

	for _, provider := range s.providers {
		if provider.Name() != "tmdb" {
			continue
		}
		type tmdbDirect interface {
			LookupByID(ctx context.Context, id int, mediaType string) (Info, error)
		}
		directProvider, ok := provider.(tmdbDirect)
		if !ok {
			continue
		}
		info, err := directProvider.LookupByID(ctx, hint.TMDBID, hint.MediaType)
		if err != nil {
			return Info{}, err
		}
		return info, nil
	}

	return Info{}, ErrNotFound
}
