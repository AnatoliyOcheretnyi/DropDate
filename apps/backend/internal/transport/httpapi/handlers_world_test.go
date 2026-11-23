package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/recommendations"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/saved"
	"io"
	"log"
	"net/http/httptest"
	"sync/atomic"
	"testing"
)

type worldCatalogueProvider struct {
	stubDiscoverSuggester
	calls atomic.Int32
}

func (p *worldCatalogueProvider) Discover(_ context.Context, params release.DiscoverParams) ([]release.DiscoverItem, error) {
	p.calls.Add(1)
	items := make([]release.DiscoverItem, 20)
	for i := range items {
		id := (params.Page-1)*20 + i + 1
		items[i] = release.DiscoverItem{TMDBID: id, MediaType: "movie", Title: fmt.Sprint(id), PosterURL: "poster.jpg", Rating: 8, VoteCount: 100}
	}
	return items, nil
}

func (*worldCatalogueProvider) Details(_ context.Context, id int, _ string) (release.Details, error) {
	return release.Details{Runtime: 90, Genres: []string{"Драма"}}, nil
}

func TestWorldCatalogueKeepsAllSixtyFilmsAndPaginates(t *testing.T) {
	for _, mode := range []string{"top", "popular", "gems"} {
		t.Run(mode, func(t *testing.T) {
			provider := &worldCatalogueProvider{}
			logger := log.New(io.Discard, "", 0)
			server := NewServer(release.NewService(nil, provider, logger), nil, nil, nil, nil, nil, nil, nil, logger, ServerOptions{})
			seen := map[int]bool{}
			for page := 1; page <= 2; page++ {
				recorder := httptest.NewRecorder()
				server.worldHandler(recorder, httptest.NewRequest("GET", fmt.Sprintf("/world?country=IN&mode=%s&page=%d", mode, page), nil))
				var result worldResult
				if recorder.Code != 200 || json.Unmarshal(recorder.Body.Bytes(), &result) != nil {
					t.Fatalf("invalid response: %d %s", recorder.Code, recorder.Body.String())
				}
				if len(result.Items) != 60 || result.AIUsed || result.Partial {
					t.Fatalf("expected full catalogue page without AI: %d items, %+v", len(result.Items), result)
				}
				for _, item := range result.Items {
					if seen[item.TMDBID] {
						t.Fatalf("duplicate movie across catalogue pages: %d", item.TMDBID)
					}
					seen[item.TMDBID] = true
				}
			}
			if provider.calls.Load() != 6 {
				t.Fatalf("expected only three discovery requests per page, got %d", provider.calls.Load())
			}
		})
	}
}

func TestWorldFiltersRejectInvalidInputs(t *testing.T) {
	for _, query := range []string{"country=ZZ", "mode=unknown", "runtime=-2", "runtime=abc", "decade=2011", "page=0", "page=11", "providers=8", "providers=8,x&region=UA", "region=ZZ"} {
		t.Run(query, func(t *testing.T) {
			_, err := parseWorldFilters(httptest.NewRequest("GET", "/world?"+query, nil))
			if err == nil {
				t.Fatal("invalid input accepted")
			}
		})
	}
	f, err := parseWorldFilters(httptest.NewRequest("GET", "/world?country=jp&mode=top&decade=1990&runtime=90&region=UA&providers=8,9", nil))
	if err != nil || f.country != "JP" || f.runtime != 90 || len(f.providers) != 2 {
		t.Fatalf("valid filters rejected: %+v %v", f, err)
	}
}
func TestWorldQualityDiscountsTinySamples(t *testing.T) {
	acclaimed := worldQuality(release.DiscoverItem{Rating: 8, VoteCount: 1000})
	tiny := worldQuality(release.DiscoverItem{Rating: 10, VoteCount: 3})
	if acclaimed <= tiny {
		t.Fatal("three perfect votes should not outrank a well-supported 8")
	}
	if worldQuality(release.DiscoverItem{}) != 6.5 {
		t.Fatal("empty rating should shrink to prior")
	}
}
func TestWatchedTitleDoesNotCountInterest(t *testing.T) {
	for _, kind := range []string{"watchlist", "favorite", "liked", "follow"} {
		if watchedTitle(saved.Title{ListTypes: []string{kind}}) {
			t.Fatalf("%s is not a viewing", kind)
		}
	}
	if !watchedTitle(saved.Title{ListTypes: []string{"watched"}}) || !watchedTitle(saved.Title{WatchCount: 1}) {
		t.Fatal("explicit view missing")
	}
}
func TestPassportMoviesIncludesEveryViewingStatusOnce(t *testing.T) {
	rows := []saved.Title{
		{TMDBID: 4, MediaType: "movie", ListTypes: []string{"disliked"}},
		{TMDBID: 1, MediaType: "movie", ListTypes: []string{"watchlist"}},
		{TMDBID: 1, MediaType: "movie", ListTypes: []string{"favorite"}},
		{TMDBID: 2, MediaType: "movie", ListTypes: []string{"liked", "follow"}},
		{TMDBID: 3, MediaType: "movie", ListTypes: []string{"watched"}},
		{TMDBID: 1, MediaType: "movie", ListTypes: []string{"watched"}, WatchCount: 5},
		{TMDBID: 5, MediaType: "movie", ListTypes: []string{"watchlist"}, WatchCount: 1},
		{TMDBID: 6, MediaType: "movie", ListTypes: []string{"follow"}, WatchCount: 2},
		{TMDBID: 7, MediaType: "tv", ListTypes: []string{"favorite"}},
		{TMDBID: 8, MediaType: "movie", ListTypes: []string{"unknown"}},
	}
	got := passportMovies(rows)
	if len(got) != 4 {
		t.Fatalf("expected four distinct viewed movies, got %+v", got)
	}
	for i, row := range got {
		if row.TMDBID != i+1 {
			t.Fatalf("expected stable, unique movie IDs 1–4, got %+v", got)
		}
	}
}
func TestRecommendationPageExcludesShownAndBlendsNovelty(t *testing.T) {
	pool := []recommendations.Item{}
	for i := 1; i <= 10; i++ {
		pool = append(pool, recommendations.Item{TMDBID: i, MediaType: "movie"})
	}
	for i := 11; i <= 20; i++ {
		pool = append(pool, recommendations.Item{TMDBID: i, MediaType: "movie", Reason: recommendations.Reason{PrimarySource: "explore"}})
	}
	first := selectRecommendationPage(pool, nil, 4, 50)
	count := 0
	excluded := map[string]bool{}
	for _, item := range first {
		if item.Reason.PrimarySource == "explore" {
			count++
		}
		excluded[recKey(item.TMDBID, item.MediaType)] = true
	}
	if len(first) != 4 || count != 2 {
		t.Fatalf("expected balanced four picks: %+v", first)
	}
	second := selectRecommendationPage(pool, excluded, 4, 50)
	for _, item := range second {
		if excluded[recKey(item.TMDBID, item.MediaType)] {
			t.Fatal("repeated a shown title")
		}
	}
	for _, item := range selectRecommendationPage(pool, nil, 4, 100) {
		if item.Reason.PrimarySource != "explore" {
			t.Fatal("novelty=100 should prefer exploration")
		}
	}
	if len(pool) != 20 {
		t.Fatal("mutated cached pool")
	}
}
func TestWorldPersonalRequiresAuth(t *testing.T) {
	server := &Server{releases: &release.Service{}}
	recorder := httptest.NewRecorder()
	server.worldHandler(recorder, httptest.NewRequest("GET", "/world?country=UA&mode=personal", nil))
	if recorder.Code != 401 {
		t.Fatalf("got %d", recorder.Code)
	}
}
