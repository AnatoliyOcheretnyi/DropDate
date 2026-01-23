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
	ID                int      `json:"id"`
	Title             string   `json:"title"`
	MediaType         string   `json:"mediaType"`
	Overview          string   `json:"overview,omitempty"`
	Tagline           string   `json:"tagline,omitempty"`
	PosterURL         string   `json:"posterUrl,omitempty"`
	BackdropURL       string   `json:"backdropUrl,omitempty"`
	Status            string   `json:"status,omitempty"`
	ReleaseDate       string   `json:"releaseDate,omitempty"`
	FirstAirDate      string   `json:"firstAirDate,omitempty"`
	LastAirDate       string   `json:"lastAirDate,omitempty"`
	NextAirDate       string   `json:"nextAirDate,omitempty"`
	NextEpisode       string   `json:"nextEpisodeName,omitempty"`
	NextEpisodeSeason int      `json:"nextEpisodeSeason,omitempty"`
	NextEpisodeNumber int      `json:"nextEpisodeNumber,omitempty"`
	LastEpisode       string   `json:"lastEpisodeName,omitempty"`
	LastEpisodeSeason int      `json:"lastEpisodeSeason,omitempty"`
	LastEpisodeNumber int      `json:"lastEpisodeNumber,omitempty"`
	SeasonCount       int      `json:"seasonCount,omitempty"`
	EpisodeCount      int      `json:"episodeCount,omitempty"`
	Runtime           int      `json:"runtime,omitempty"`
	Genres            []string `json:"genres,omitempty"`
	Networks          []string `json:"networks,omitempty"`
	VoteAverage       float64  `json:"voteAverage,omitempty"`
	VoteCount         int      `json:"voteCount,omitempty"`
	Popularity        float64  `json:"popularity,omitempty"`
	Homepage          string   `json:"homepage,omitempty"`
	OriginCountry     []string `json:"originCountry,omitempty"`
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
		logger:   logger,
		cache:    make(map[string]cacheEntry),
		cacheTTL: defaultCacheTTL,
	}
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
			dateSource = details.FirstAirDate
		}
		if dateSource == "" {
			continue
		}
		parsed, err := time.Parse("2006-01-02", dateSource)
		if err != nil {
			continue
		}
		if parsed.After(now) {
			out = append(out, item)
		}
	}
	return out, nil
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
