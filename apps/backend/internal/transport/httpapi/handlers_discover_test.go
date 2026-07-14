package httpapi

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
)

// stubDiscoverSuggester implements both release.SuggestionProvider and
// release.DiscoverProvider so it can back a real release.Service in tests.
type stubDiscoverSuggester struct {
	movieParams release.DiscoverParams
	tvParams    release.DiscoverParams
	callCount   int
}

func (s *stubDiscoverSuggester) Name() string { return "stub" }

func (s *stubDiscoverSuggester) Suggestions(_ context.Context, _ string, _ int) ([]release.Suggestion, error) {
	return nil, nil
}

func (s *stubDiscoverSuggester) Discover(_ context.Context, p release.DiscoverParams) ([]release.DiscoverItem, error) {
	s.callCount++
	if p.MediaType == "tv" {
		s.tvParams = p
		return []release.DiscoverItem{
			{TMDBID: 2, Title: "Series One", MediaType: "tv", Year: "2021"},
		}, nil
	}
	s.movieParams = p
	return []release.DiscoverItem{
		{TMDBID: 1, Title: "Movie One", MediaType: "movie", Year: "2020"},
	}, nil
}

func newDiscoverTestServer(suggester *stubDiscoverSuggester) *Server {
	svc := release.NewService(nil, suggester, log.New(io.Discard, "", 0))
	return NewServer(svc, nil, nil, nil, nil, nil, nil, nil, log.New(io.Discard, "", 0), ServerOptions{})
}

func TestDiscoverHandlerRequiresFilters(t *testing.T) {
	server := newDiscoverTestServer(&stubDiscoverSuggester{})

	req := httptest.NewRequest(http.MethodGet, "/discover", nil)
	rec := httptest.NewRecorder()
	server.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestDiscoverHandlerMixesMoviesAndSeries(t *testing.T) {
	suggester := &stubDiscoverSuggester{}
	server := newDiscoverTestServer(suggester)

	req := httptest.NewRequest(http.MethodGet, "/discover?genres=action&countries=kr", nil)
	rec := httptest.NewRecorder()
	server.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var payload struct {
		Results []release.Suggestion `json:"results"`
		Page    int                  `json:"page"`
		HasMore bool                 `json:"hasMore"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload.Results) != 2 {
		t.Fatalf("expected 2 mixed results, got %d", len(payload.Results))
	}
	if payload.Results[0].MediaType != "movie" || payload.Results[1].MediaType != "tv" {
		t.Fatalf("expected movie then tv, got %v", payload.Results)
	}

	if len(suggester.movieParams.WithGenres) != 1 || suggester.movieParams.WithGenres[0] != 28 {
		t.Fatalf("expected movie genre 28 (action), got %v", suggester.movieParams.WithGenres)
	}
	if len(suggester.tvParams.WithGenres) != 1 || suggester.tvParams.WithGenres[0] != 10759 {
		t.Fatalf("expected tv genre 10759 (action & adventure), got %v", suggester.tvParams.WithGenres)
	}
	if len(suggester.movieParams.WithOriginCountry) != 1 || suggester.movieParams.WithOriginCountry[0] != "KR" {
		t.Fatalf("expected origin country KR, got %v", suggester.movieParams.WithOriginCountry)
	}
}

func TestDiscoverHandlerSkipsTVWhenGenreHasNoTVMapping(t *testing.T) {
	suggester := &stubDiscoverSuggester{}
	server := newDiscoverTestServer(suggester)

	req := httptest.NewRequest(http.MethodGet, "/discover?genres=horror", nil)
	rec := httptest.NewRecorder()
	server.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if suggester.callCount != 1 {
		t.Fatalf("expected only the movie leg to run, got %d calls", suggester.callCount)
	}

	var payload struct {
		Results []release.Suggestion `json:"results"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload.Results) != 1 || payload.Results[0].MediaType != "movie" {
		t.Fatalf("expected only movie results, got %v", payload.Results)
	}
}

func TestDiscoverHandlerUnknownFiltersRejected(t *testing.T) {
	server := newDiscoverTestServer(&stubDiscoverSuggester{})

	req := httptest.NewRequest(http.MethodGet, "/discover?genres=not-a-real-genre", nil)
	rec := httptest.NewRecorder()
	server.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for unknown genre, got %d", rec.Code)
	}
}
