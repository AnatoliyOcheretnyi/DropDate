package release

import (
	"errors"
	"strings"
	"time"
)

// Info описує наступний реліз фільму або серіалу.
type Info struct {
	Title       string    `json:"title"`
	Type        string    `json:"type"` // movie або series
	NextRelease time.Time `json:"nextRelease"`
	Source      string    `json:"source"`
}

var (
	// ErrNotFound повертаємо, коли користувач питає про невідомий тайтл.
	ErrNotFound = errors.New("release not found")
)

// Service поки тримає мокові дані в памʼяті.
type Service struct {
	data map[string]Info
}

// NewService ініціалізує сервіс набором статичних релізів.
func NewService() *Service {
	seed := []Info{
		{
			Title:       "Dune: Part Two",
			Type:        "movie",
			NextRelease: time.Date(2024, time.March, 1, 0, 0, 0, 0, time.UTC),
			Source:      "tmdb-mock",
		},
		{
			Title:       "Stranger Things",
			Type:        "series",
			NextRelease: time.Date(2025, time.August, 15, 0, 0, 0, 0, time.UTC),
			Source:      "tvmaze-mock",
		},
	}

	data := make(map[string]Info, len(seed))
	for _, info := range seed {
		data[strings.ToLower(info.Title)] = info
	}

	return &Service{data: data}
}

// NextRelease повертає реліз за назвою.
func (s *Service) NextRelease(title string) (Info, error) {
	info, ok := s.data[strings.ToLower(title)]
	if !ok {
		return Info{}, ErrNotFound
	}
	return info, nil
}
