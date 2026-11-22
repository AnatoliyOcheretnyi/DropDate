package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http/httptest"
	"testing"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
)

type atlasDiscoverStub struct {
	stubDiscoverSuggester
	params release.DiscoverParams
	err    error
}

func (s *atlasDiscoverStub) Discover(_ context.Context, p release.DiscoverParams) ([]release.DiscoverItem, error) {
	s.callCount++
	s.params = p
	if s.err != nil {
		return nil, s.err
	}
	return []release.DiscoverItem{
		{TMDBID: 1, Title: "No poster"},
		{TMDBID: 2, Title: "First", MediaType: "movie", PosterURL: "first.jpg"},
		{TMDBID: 2, Title: "Duplicate", PosterURL: "duplicate.jpg"},
		{TMDBID: 3, Title: "Second", MediaType: "movie", PosterURL: "second.jpg"},
		{TMDBID: 4, Title: "Third", MediaType: "movie", PosterURL: "third.jpg"},
		{TMDBID: 5, Title: "Extra", PosterURL: "extra.jpg"},
	}, nil
}

func TestWorldPreviewUsesOneCachedDiscoveryPageWithoutPersonalization(t *testing.T) {
	provider := &atlasDiscoverStub{}
	logger := log.New(io.Discard, "", 0)
	server := NewServer(release.NewService(nil, provider, logger), nil, nil, nil, nil, nil, nil, nil, logger, ServerOptions{})
	for i := 0; i < 2; i++ {
		recorder := httptest.NewRecorder()
		server.worldHandler(recorder, httptest.NewRequest("GET", "/world?country=JP&preview=1", nil))
		if recorder.Code != 200 {
			t.Fatalf("status %d: %s", recorder.Code, recorder.Body.String())
		}
		var result worldResult
		if err := json.Unmarshal(recorder.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		if len(result.Items) != 3 || result.Items[0].TMDBID != 2 || result.Items[2].TMDBID != 4 || result.AIUsed {
			t.Fatalf("unexpected preview: %+v", result)
		}
		for _, item := range result.Items {
			if item.Country != "JP" {
				t.Fatal("wrong origin")
			}
		}
	}
	if provider.callCount != 1 || provider.params.Page != 1 || provider.params.MediaType != "movie" || provider.params.WithOriginCountry[0] != "JP" {
		t.Fatalf("preview must use one cached movie page: %+v", provider)
	}
}

func TestWorldPreviewRejectsMissingCountryAndSurfacesProviderFailure(t *testing.T) {
	provider := &atlasDiscoverStub{err: errors.New("offline")}
	logger := log.New(io.Discard, "", 0)
	server := NewServer(release.NewService(nil, provider, logger), nil, nil, nil, nil, nil, nil, nil, logger, ServerOptions{})
	for _, check := range []struct {
		query  string
		status int
	}{
		{"preview=1", 400}, {"country=INVALID&preview=1", 400}, {"country=UA&preview=1", 502},
	} {
		recorder := httptest.NewRecorder()
		server.worldHandler(recorder, httptest.NewRequest("GET", "/world?"+check.query, nil))
		if recorder.Code != check.status {
			t.Fatalf("%s: got %d, expected %d", check.query, recorder.Code, check.status)
		}
	}
}
