package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http/httptest"
	"testing"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/atlas"
)

type catalogStoreStub struct {
	rows map[string]atlas.Country
	err  error
}

func (s *catalogStoreStub) List(context.Context) (map[string]atlas.Country, error) {
	return s.rows, s.err
}
func (*catalogStoreStub) Acquire(context.Context, string) (bool, error) {
	panic("HTTP reads must not refresh")
}
func (*catalogStoreStub) Release(context.Context, string) error                      { return nil }
func (*catalogStoreStub) Save(context.Context, string, string, []atlas.Poster) error { return nil }
func (*catalogStoreStub) Defer(context.Context, string, string) error                { return nil }

func TestAtlasCatalogReadsPersistedPostersAndSupportsConditionalRequests(t *testing.T) {
	store := &catalogStoreStub{rows: map[string]atlas.Country{"UA": {Posters: []atlas.Poster{{TMDBID: 1, Title: "Фільм", PosterURL: "https://image.tmdb.org/t/p/w342/poster.jpg"}}}}}
	s := &Server{atlas: atlas.New(store, nil, nil), logger: log.New(io.Discard, "", 0)}
	w := httptest.NewRecorder()
	s.worldAtlasHandler(w, httptest.NewRequest("GET", "/world/atlas", nil))
	var catalog atlas.Catalog
	if w.Code != 200 || json.Unmarshal(w.Body.Bytes(), &catalog) != nil || len(catalog.Countries["UA"].Posters) != 1 {
		t.Fatalf("unexpected catalog: %d %s", w.Code, w.Body.String())
	}
	etag := w.Header().Get("ETag")
	if etag == "" || w.Header().Get("Cache-Control") == "" {
		t.Fatal("missing cache headers")
	}
	r := httptest.NewRequest("GET", "/world/atlas", nil)
	r.Header.Set("If-None-Match", etag)
	w = httptest.NewRecorder()
	s.worldAtlasHandler(w, r)
	if w.Code != 304 || w.Body.Len() != 0 {
		t.Fatal("unchanged catalog should return no body")
	}
	store.rows["UA"] = atlas.Country{Posters: []atlas.Poster{{TMDBID: 2, Title: "Новий фільм"}}}
	w = httptest.NewRecorder()
	s.worldAtlasHandler(w, r)
	if w.Code != 200 || w.Header().Get("ETag") == etag {
		t.Fatal("refreshed catalog must invalidate ETag")
	}
}

func TestAtlasUnavailableAndJobAuthorization(t *testing.T) {
	store := &catalogStoreStub{}
	s := &Server{atlas: atlas.New(store, nil, nil), logger: log.New(io.Discard, "", 0), jobsAccessToken: "job-test-secret"}
	for _, err := range []error{nil, errors.New("database offline")} {
		store.err = err
		w := httptest.NewRecorder()
		s.worldAtlasHandler(w, httptest.NewRequest("GET", "/world/atlas", nil))
		if w.Code != 503 {
			t.Fatalf("empty or unavailable catalog: %d", w.Code)
		}
	}
	for _, tc := range []struct {
		method, token string
		status        int
	}{
		{"POST", "", 401}, {"POST", "Bearer wrong", 401},
		{"POST", "Bearer job-test-secret", 202}, {"GET", "Bearer job-test-secret", 405},
	} {
		r := httptest.NewRequest(tc.method, "/jobs/world-atlas", nil)
		r.Header.Set("Authorization", tc.token)
		w := httptest.NewRecorder()
		s.worldAtlasJobHandler(w, r)
		if w.Code != tc.status {
			t.Fatalf("%s: got %d, want %d", tc.method, w.Code, tc.status)
		}
	}
}
