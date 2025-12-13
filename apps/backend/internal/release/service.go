package release

import (
	"context"
	"errors"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/tvmaze"
)

// Info описує наступний реліз фільму або серіалу.
type Info struct {
	Title       string    `json:"title"`
	Type        string    `json:"type"`
	NextRelease time.Time `json:"nextRelease"`
	Source      string    `json:"source"`
}

var (
	// ErrNotFound повертаємо, коли користувач питає про невідомий тайтл.
	ErrNotFound = errors.New("release not found")
)

// Service працює поверх TVMaze API.
type Service struct {
	tvmaze *tvmaze.Client
}

// NewService приймає залежність у вигляді клієнта.
func NewService(client *tvmaze.Client) *Service {
	if client == nil {
		client = tvmaze.NewClient(nil)
	}
	return &Service{tvmaze: client}
}

// NextRelease витягує дані з TVMaze і мапить у нашу структуру.
func (s *Service) NextRelease(ctx context.Context, title string) (Info, error) {
	info, err := s.tvmaze.NextRelease(ctx, title)
	if err != nil {
		if errors.Is(err, tvmaze.ErrNotFound) {
			return Info{}, ErrNotFound
		}
		return Info{}, err
	}

	return Info{
		Title:       info.Title,
		Type:        info.Type,
		NextRelease: info.NextRelease,
		Source:      info.Source,
	}, nil
}
