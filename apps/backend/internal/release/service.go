package release

import (
	"context"
	"errors"
	"log"
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
		tvmaze: tvmazeClient,
		tmdb:   tmdbClient,
		logger: logger,
	}
}

// NextRelease витягує дані з TVMaze і мапить у нашу структуру.
func (s *Service) NextRelease(ctx context.Context, title string) (Info, error) {
	// TVMaze покриває серіали й повертає найближчий епізод.
	if s.tvmaze != nil {
		s.logf("tvmaze lookup for %q", title)
		info, err := s.tvmaze.NextRelease(ctx, title)
		if err == nil {
			s.logf("tvmaze hit: title=%q type=%s next=%s", info.Title, info.Type, info.NextRelease.Format(time.RFC3339))
			return Info{
				Title:       info.Title,
				Type:        info.Type,
				NextRelease: info.NextRelease,
				Source:      info.Source,
			}, nil
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
			return Info{
				Title:       info.Title,
				Type:        info.Type,
				NextRelease: info.NextRelease,
				Source:      info.Source,
			}, nil
		}
		if errors.Is(err, tmdb.ErrNotFound) {
			s.logf("tmdb miss for %q", title)
		} else {
			s.logf("tmdb error for %q: %v", title, err)
			return Info{}, err
		}
	}

	s.logf("no releases found for %q", title)
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
