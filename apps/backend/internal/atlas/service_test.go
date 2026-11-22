package atlas

import (
	"context"
	"errors"
	"fmt"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/discoverydata"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/tmdb"
	"io"
	"log"
	"testing"
	"time"
)

type memoryStore struct {
	rows             map[string]Country
	busy, released   bool
	writes, deferred int
}

func (s *memoryStore) List(context.Context) (map[string]Country, error) { return s.rows, nil }
func (s *memoryStore) Acquire(context.Context, string) (bool, error)    { return !s.busy, nil }
func (s *memoryStore) Release(context.Context, string) error            { s.released = true; return nil }
func (s *memoryStore) Save(_ context.Context, _, code string, posters []Poster) error {
	s.writes++
	now := time.Now()
	s.rows[code] = Country{posters, &now, now.AddDate(0, 1, 0)}
	return nil
}
func (s *memoryStore) Defer(_ context.Context, _, code string) error {
	s.deferred++
	row := s.rows[code]
	row.NextRefreshAt = time.Now().Add(6 * time.Hour)
	s.rows[code] = row
	return nil
}

type stubSource struct {
	calls int
	items []tmdb.DiscoverItem
	err   error
}

func (s *stubSource) Discover(_ context.Context, p tmdb.DiscoverParams) ([]tmdb.DiscoverItem, error) {
	s.calls++
	if p.MediaType != "movie" || len(p.WithOriginCountry) != 1 || p.Page != 1 {
		panic("unbounded atlas request")
	}
	return s.items, s.err
}
func freshStore() *memoryStore {
	s := &memoryStore{rows: map[string]Country{}}
	for code := range discoverydata.Countries {
		s.rows[code] = Country{NextRefreshAt: time.Now().AddDate(0, 1, 0)}
	}
	return s
}
func TestRefreshOnlyDueCountriesAndRetainsOldPostersOnFailure(t *testing.T) {
	for _, kind := range []string{"success", "error", "empty"} {
		t.Run(kind, func(t *testing.T) {
			store := freshStore()
			old := Poster{TMDBID: 1, Title: "Old", PosterURL: "https://image.tmdb.org/t/p/w185/old.jpg"}
			store.rows["UA"] = Country{Posters: []Poster{old}}
			source := &stubSource{items: []tmdb.DiscoverItem{{ID: 2, Title: "New", PosterURL: "https://image.tmdb.org/t/p/w342/new.jpg"}}}
			if kind == "error" {
				source.err = errors.New("offline")
			}
			if kind == "empty" {
				source.items = nil
			}
			svc := New(store, source, log.New(io.Discard, "", 0))
			report, err := svc.Refresh(context.Background())
			if err != nil || source.calls != 1 || !store.released {
				t.Fatalf("refresh: %+v %v", report, err)
			}
			if kind == "success" {
				if report.Updated != 1 || store.rows["UA"].Posters[0].TMDBID != 2 {
					t.Fatal("new posters not saved")
				}
			} else if report.Failed != 1 || store.rows["UA"].Posters[0].TMDBID != 1 || store.deferred != 1 {
				t.Fatal("lost last successful snapshot")
			}
			_, err = svc.Refresh(context.Background())
			if err != nil || source.calls != 1 {
				t.Fatal("fresh/retry-backoff countries fetched again")
			}
		})
	}
}
func TestRefreshLeaseAndCanceledContextMakeNoProviderCalls(t *testing.T) {
	store := freshStore()
	store.busy = true
	source := &stubSource{}
	_, err := New(store, source, nil).Refresh(context.Background())
	if !errors.Is(err, ErrBusy) || source.calls != 0 {
		t.Fatal("concurrent refresh was not blocked")
	}
	store.busy = false
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err = New(store, source, nil).Refresh(ctx)
	if !errors.Is(err, context.Canceled) || source.calls != 0 {
		t.Fatal("canceled work continued")
	}
}
func TestPosterSelectionIsBoundedDeduplicatedAndUsesTMDBOnly(t *testing.T) {
	items := []tmdb.DiscoverItem{{ID: 1, Title: "Bad", PosterURL: "https://example.com/a.jpg"}}
	for i := 1; i <= 30; i++ {
		item := tmdb.DiscoverItem{ID: i, Title: fmt.Sprint(i), PosterURL: fmt.Sprintf("https://image.tmdb.org/t/p/w342/%d.jpg", i)}
		items = append(items, item, item)
	}
	got := selectPosters(items)
	if len(got) != 24 || got[0].TMDBID != 1 || got[23].TMDBID != 24 {
		t.Fatalf("unexpected selection: %+v", got)
	}
}

type pagedPosterSource struct {
	pages      []int
	failSecond bool
}

func (s *pagedPosterSource) Discover(_ context.Context, p tmdb.DiscoverParams) ([]tmdb.DiscoverItem, error) {
	s.pages = append(s.pages, p.Page)
	if p.Page == 2 && s.failSecond {
		return nil, errors.New("second page offline")
	}
	items := make([]tmdb.DiscoverItem, 20)
	for i := range items {
		// Overlap two results between pages to verify cross-page deduplication.
		id := (p.Page-1)*18 + i + 1
		items[i] = tmdb.DiscoverItem{ID: id, Title: fmt.Sprint(id), PosterURL: fmt.Sprintf("https://image.tmdb.org/t/p/w342/%d.jpg", id)}
	}
	return items, nil
}
func TestLargeCountryFetchesTwoPagesAndPreservesSnapshotIfSecondFails(t *testing.T) {
	for _, failSecond := range []bool{false, true} {
		store := freshStore()
		store.rows["RU"] = Country{Posters: []Poster{{TMDBID: 99}}}
		source := &pagedPosterSource{failSecond: failSecond}
		report, err := New(store, source, nil).Refresh(context.Background())
		if err != nil || len(source.pages) != 2 || source.pages[0] != 1 || source.pages[1] != 2 {
			t.Fatalf("pagination: %v %v", source.pages, err)
		}
		if failSecond {
			if report.Failed != 1 || store.rows["RU"].Posters[0].TMDBID != 99 {
				t.Fatal("second-page failure lost snapshot")
			}
		} else if len(store.rows["RU"].Posters) != 24 || store.rows["RU"].Posters[23].TMDBID != 24 {
			t.Fatal("expected 24 distinct posters across pages")
		}
	}
	source := &pagedPosterSource{}
	posters, err := New(nil, source, nil).discoverPosters(context.Background(), "UA")
	if err != nil || len(source.pages) != 1 || len(posters) != 12 {
		t.Fatal("smaller countries should keep one page and 12 stored posters")
	}
}
