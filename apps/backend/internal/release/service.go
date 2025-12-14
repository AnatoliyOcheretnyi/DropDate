package release

import (
	"context"
	"errors"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/tmdb"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/tvmaze"
)

// Info описує наступний реліз фільму або серіалу.
type Info struct {
	Title       string    `json:"title"`
	Type        string    `json:"type"`
	NextRelease time.Time `json:"nextRelease"`
	Source      string    `json:"source"`
	PosterURL   string    `json:"posterUrl,omitempty"`
}

// Suggestion describes minimal search result.
type Suggestion struct {
	ID        int    `json:"id"`
	Title     string `json:"title"`
	MediaType string `json:"mediaType"`
	Year      string `json:"year,omitempty"`
}

var (
	// ErrNotFound повертаємо, коли користувач питає про невідомий тайтл.
	ErrNotFound = errors.New("release not found")
)

// Service працює поверх TVMaze API.
type Service struct {
	tvmaze *tvmaze.Client
	tmdb   *tmdb.Client
	logger *log.Logger

	cache    map[string]cacheEntry
	cacheMu  sync.RWMutex
	cacheTTL time.Duration
}

type cacheEntry struct {
	info    Info
	expires time.Time
}

// NewService приймає залежності у вигляді клієнтів.
func NewService(tvmazeClient *tvmaze.Client, tmdbClient *tmdb.Client, logger *log.Logger) *Service {
	if tvmazeClient == nil {
		tvmazeClient = tvmaze.NewClient(nil)
	}
	if logger == nil {
		logger = log.Default()
	}
	return &Service{
		tvmaze:   tvmazeClient,
		tmdb:     tmdbClient,
		logger:   logger,
		cache:    make(map[string]cacheEntry),
		cacheTTL: 30 * time.Minute,
	}
}

// NextRelease витягує дані з TVMaze і мапить у нашу структуру.
func (s *Service) NextRelease(ctx context.Context, title string) (Info, error) {
	start := time.Now()
	key := s.cacheKey(title)
	if info, ok := s.lookupCache(key); ok {
		s.logf("cache hit for %q (took %s)", title, time.Since(start))
		return info, nil
	}

	// TVMaze покриває серіали й повертає найближчий епізод.
	if s.tvmaze != nil {
		s.logf("tvmaze lookup for %q", title)
		info, err := s.tvmaze.NextRelease(ctx, title)
		if err == nil {
			s.logf("tvmaze hit: title=%q type=%s next=%s", info.Title, info.Type, info.NextRelease.Format(time.RFC3339))
			out := Info{
				Title:       info.Title,
				Type:        info.Type,
				NextRelease: info.NextRelease,
				Source:      info.Source,
				PosterURL:   info.PosterURL,
			}
			s.saveCache(key, out)
			s.logf("tvmaze response for %q took %s", title, time.Since(start))
			return out, nil
		}
		if errors.Is(err, tvmaze.ErrNotFound) {
			s.logf("tvmaze miss for %q", title)
		} else {
			s.logf("tvmaze error for %q: %v", title, err)
			return Info{}, err
		}
	}

	// TMDB додає ще й дані по фільмах та серіалах.
	if s.tmdb != nil {
		s.logf("tmdb lookup for %q", title)
		info, err := s.tmdb.NextRelease(ctx, title)
		if err == nil {
			s.logf("tmdb hit: title=%q type=%s next=%s", info.Title, info.Type, info.NextRelease.Format(time.RFC3339))
			out := Info{
				Title:       info.Title,
				Type:        info.Type,
				NextRelease: info.NextRelease,
				Source:      info.Source,
				PosterURL:   info.PosterURL,
			}
			s.saveCache(key, out)
			s.logf("tmdb response for %q took %s", title, time.Since(start))
			return out, nil
		}
		if errors.Is(err, tmdb.ErrNotFound) {
			s.logf("tmdb miss for %q", title)
		} else {
			s.logf("tmdb error for %q: %v", title, err)
			return Info{}, err
		}
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
	if s.tmdb == nil {
		return []Suggestion{}, nil
	}

	results, err := s.tmdb.Suggestions(ctx, query, limit)
	if err != nil {
		return nil, err
	}

	out := make([]Suggestion, 0, len(results))
	for _, res := range results {
		out = append(out, Suggestion{
			ID:        res.ID,
			Title:     res.Title,
			MediaType: res.MediaType,
			Year:      res.Year,
		})
	}

	return out, nil
}

func (s *Service) cacheKey(title string) string {
	return strings.ToLower(strings.TrimSpace(title))
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
