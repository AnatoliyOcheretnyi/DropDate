package httpapi

import (
	"github.com/AnatoliyOcheretnyi/dropdate/internal/recommendations"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/saved"
	"net/http/httptest"
	"testing"
)

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
