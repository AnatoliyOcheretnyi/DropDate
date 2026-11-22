package atlas

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/discoverydata"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/tmdb"
)

const MaxPosters = 24

func countryPosterLimit(code string) int {
	if code == "RU" {
		return MaxPosters
	}
	return 12
}

var ErrBusy = errors.New("atlas refresh is already running")

type Poster struct {
	TMDBID    int     `json:"tmdbId"`
	MediaType string  `json:"mediaType"`
	Title     string  `json:"title"`
	Year      string  `json:"year,omitempty"`
	PosterURL string  `json:"posterUrl"`
	Rating    float64 `json:"rating,omitempty"`
}
type Country struct {
	Posters       []Poster   `json:"posters"`
	RefreshedAt   *time.Time `json:"refreshedAt,omitempty"`
	NextRefreshAt time.Time  `json:"-"`
}
type Catalog struct {
	Countries map[string]Country `json:"countries"`
	Complete  bool               `json:"complete"`
}
type Report struct {
	Updated int `json:"updated"`
	Failed  int `json:"failed"`
	Skipped int `json:"skipped"`
}
type Source interface {
	Discover(context.Context, tmdb.DiscoverParams) ([]tmdb.DiscoverItem, error)
}
type Store interface {
	List(context.Context) (map[string]Country, error)
	Acquire(context.Context, string) (bool, error)
	Release(context.Context, string) error
	Save(context.Context, string, string, []Poster) error
	Defer(context.Context, string, string) error
}
type Service struct {
	store  Store
	source Source
	logger *log.Logger
	wake   chan struct{}
}

func New(store Store, source Source, logger *log.Logger) *Service {
	if logger == nil {
		logger = log.Default()
	}
	return &Service{store, source, logger, make(chan struct{}, 1)}
}
func (s *Service) Catalog(ctx context.Context) (Catalog, error) {
	rows, err := s.store.List(ctx)
	if rows == nil {
		rows = map[string]Country{}
	}
	return Catalog{Countries: rows, Complete: len(rows) >= len(discoverydata.Countries)}, err
}

func (s *Service) Refresh(ctx context.Context) (Report, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Minute)
	defer cancel()
	var report Report
	var token [16]byte
	if _, err := rand.Read(token[:]); err != nil {
		return report, err
	}
	owner := hex.EncodeToString(token[:])
	locked, err := s.store.Acquire(ctx, owner)
	if err != nil {
		return report, err
	}
	if !locked {
		return report, ErrBusy
	}
	defer func() {
		cleanup, stop := context.WithTimeout(context.Background(), 3*time.Second)
		defer stop()
		if err := s.store.Release(cleanup, owner); err != nil {
			s.logger.Printf("atlas release: %v", err)
		}
	}()
	rows, err := s.store.List(ctx)
	if err != nil {
		return report, err
	}
	codes := make([]string, 0, len(discoverydata.Countries))
	for code := range discoverydata.Countries {
		codes = append(codes, code)
	}
	sort.Strings(codes)
	for _, code := range codes {
		if err := ctx.Err(); err != nil {
			return report, err
		}
		if row, ok := rows[code]; ok && row.NextRefreshAt.After(time.Now()) {
			report.Skipped++
			continue
		}
		// One source request at a time, at most four per second. No Gemini or
		// details enrichment: these are public movie posters only.
		timer := time.NewTimer(250 * time.Millisecond)
		select {
		case <-ctx.Done():
			timer.Stop()
			return report, ctx.Err()
		case <-timer.C:
		}
		requestCtx, stop := context.WithTimeout(ctx, 10*time.Second)
		posters, err := s.discoverPosters(requestCtx, code)
		stop()
		// Never erase useful artwork after an outage or an unexpectedly empty
		// provider response. A genuinely empty new country is remembered too.
		if err != nil || (len(posters) == 0 && len(rows[code].Posters) > 0) {
			report.Failed++
			if err := s.store.Defer(ctx, owner, code); err != nil {
				return report, err
			}
			continue
		}
		if err := s.store.Save(ctx, owner, code, posters); err != nil {
			return report, err
		}
		report.Updated++
	}
	return report, nil
}

func (s *Service) discoverPosters(ctx context.Context, code string) ([]Poster, error) {
	limit := countryPosterLimit(code)
	var items []tmdb.DiscoverItem
	// TMDB discovery has 20 results per page. Only the largest country needs
	// a second page; keep all other country refreshes to a single request.
	for page := 1; page <= (limit+19)/20; page++ {
		if page > 1 {
			timer := time.NewTimer(250 * time.Millisecond)
			select {
			case <-ctx.Done():
				timer.Stop()
				return nil, ctx.Err()
			case <-timer.C:
			}
		}
		batch, err := s.source.Discover(ctx, tmdb.DiscoverParams{
			MediaType: "movie", WithOriginCountry: []string{code}, SortBy: "popularity.desc",
			ReleaseDateLTE: time.Now().UTC().Format(time.DateOnly), Page: page,
		})
		if err != nil {
			return nil, err
		}
		items = append(items, batch...)
		if len(batch) == 0 {
			break
		}
	}
	posters := selectPosters(items)
	if len(posters) > limit {
		posters = posters[:limit]
	}
	return posters, nil
}

func selectPosters(items []tmdb.DiscoverItem) []Poster {
	out := make([]Poster, 0, MaxPosters)
	ids, images := map[int]bool{}, map[string]bool{}
	for _, item := range items {
		u, err := url.Parse(item.PosterURL)
		if err != nil || u.Scheme != "https" || u.Host != "image.tmdb.org" || !strings.HasPrefix(u.Path, "/t/p/") ||
			item.ID <= 0 || item.Title == "" || ids[item.ID] || images[u.Path] {
			continue
		}
		ids[item.ID], images[u.Path] = true, true
		out = append(out, Poster{item.ID, "movie", item.Title, item.Year, item.PosterURL, item.Rating})
		if len(out) == MaxPosters {
			break
		}
	}
	return out
}

func (s *Service) Run(ctx context.Context) {
	for {
		report, err := s.Refresh(ctx)
		if err != nil && !errors.Is(err, ErrBusy) && ctx.Err() == nil {
			s.logger.Printf("atlas refresh: %v", err)
		}
		if report.Updated > 0 || report.Failed > 0 {
			s.logger.Printf("atlas refresh: updated=%d failed=%d skipped=%d", report.Updated, report.Failed, report.Skipped)
		}
		timer := time.NewTimer(time.Hour)
		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-s.wake:
			timer.Stop()
		case <-timer.C:
		}
	}
}
func (s *Service) Trigger() {
	select {
	case s.wake <- struct{}{}:
	default:
	}
}
