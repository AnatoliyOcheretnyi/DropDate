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

// Info описує наступний реліз фільму або серіалу.
type Info struct {
	Title       string    `json:"title"`
	Type        string    `json:"type"`
	NextRelease time.Time `json:"nextRelease"`
	Source      string    `json:"source"`
	PosterURL   string    `json:"posterUrl,omitempty"`
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

var (
	// ErrNotFound повертаємо, коли користувач питає про невідомий тайтл.
	ErrNotFound = errors.New("release not found")
)

// Service об'єднує кілька провайдерів релізів і (опційно) провайдера підказок.
type Service struct {
	providers []ReleaseProvider
	suggester SuggestionProvider
	logger    *log.Logger

	cache    map[string]cacheEntry
	cacheMu  sync.RWMutex
	cacheTTL time.Duration
}

// LookupHint описує додаткові підказки для пошуку.
type LookupHint struct {
	TMDBID    int
	MediaType string
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
		logger:    logger,
		cache:     make(map[string]cacheEntry),
		cacheTTL:  30 * time.Minute,
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
			s.logf("%s hit: title=%q type=%s next=%s", provider.Name(), info.Title, info.Type, info.NextRelease.Format(time.RFC3339))
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

func (s *Service) cacheKey(title string, hint *LookupHint) string {
	base := strings.ToLower(strings.TrimSpace(title))
	if hint != nil && hint.TMDBID > 0 {
		return fmt.Sprintf("%s#tmdb:%d:%s", base, hint.TMDBID, hint.MediaType)
	}
	return base
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
