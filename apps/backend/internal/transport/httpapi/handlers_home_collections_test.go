package httpapi

import (
	"context"
	"errors"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/saved"
	"testing"
	"time"
)

type collectionProvider struct {
	details map[int]release.Details
	pool    []release.DiscoverItem
	credits []release.PersonCredit
}

func (p *collectionProvider) Name() string { return "collections-test" }
func (p *collectionProvider) Suggestions(context.Context, string, int) ([]release.Suggestion, error) {
	return nil, nil
}
func (p *collectionProvider) Recommendations(context.Context, int, string, int) ([]release.Suggestion, error) {
	return nil, nil
}
func (p *collectionProvider) Details(_ context.Context, id int, _ string) (release.Details, error) {
	d, ok := p.details[id]
	if !ok {
		return d, errors.New("unavailable")
	}
	return d, nil
}
func (p *collectionProvider) Discover(_ context.Context, params release.DiscoverParams) ([]release.DiscoverItem, error) {
	return p.pool, nil
}
func (p *collectionProvider) Person(_ context.Context, id int) (release.Person, error) {
	return release.Person{ID: id, Credits: p.credits}, nil
}

func TestHomeSeedsRespectAllPositiveListsAndNegativeMembership(t *testing.T) {
	rows := []saved.Title{
		{TMDBID: 1, MediaType: "movie", ListTypes: []string{"watchlist"}},
		{TMDBID: 1, MediaType: "movie", ListTypes: []string{"favorite"}},
		{TMDBID: 2, MediaType: "movie", ListTypes: []string{"liked"}},
		{TMDBID: 3, MediaType: "movie", ListTypes: []string{"favorite"}},
		{TMDBID: 3, MediaType: "movie", ListTypes: []string{"disliked"}},
		{TMDBID: 4, MediaType: "movie", ListTypes: []string{"follow"}},
		{TMDBID: 5, MediaType: "tv", ListTypes: []string{"favorite"}},
	}
	seeds := homeSeeds(rows)
	if len(seeds) != 2 || seeds[0].TMDBID != 1 || seeds[1].TMDBID != 2 {
		t.Fatalf("unexpected seeds: %+v", seeds)
	}
	seen := homeSeen(rows)
	if !seen[1] || !seen[2] || !seen[3] || seen[4] || seen[5] {
		t.Fatalf("wrong movie viewing statuses: %v", seen)
	}
}

func TestHomeReleasedRequiresExactPastDate(t *testing.T) {
	now := time.Date(2026, 11, 9, 12, 0, 0, 0, time.UTC)
	for _, date := range []string{"", "2026", "2026-02-30", "2026-11-10"} {
		if homeReleased(date, now) {
			t.Fatalf("accepted %q", date)
		}
	}
	for _, date := range []string{"2026-11-09", "2001-01-01"} {
		if !homeReleased(date, now) {
			t.Fatalf("rejected %q", date)
		}
	}
}

func TestHomeGemsFiltersWatchedFutureTinyRatingsAndWrongTaste(t *testing.T) {
	p := &collectionProvider{details: map[int]release.Details{}}
	for id := 1; id <= 7; id++ {
		p.pool = append(p.pool, release.DiscoverItem{TMDBID: id})
		p.details[id] = release.Details{ID: id, MediaType: "movie", Title: "Film", ReleaseDate: "2000-01-01", Genres: []string{"Драма"}, VoteCount: 100, VoteAverage: 8}
	}
	d := p.details[2]
	d.ReleaseDate = "2099-01-01"
	p.details[2] = d
	d = p.details[3]
	d.VoteCount = 2
	p.details[3] = d
	d = p.details[4]
	d.VoteCount = 5000
	p.details[4] = d
	d = p.details[5]
	d.Genres = []string{"Жахи"}
	p.details[5] = d
	d = p.details[6]
	d.VoteAverage = 6
	p.details[6] = d
	s := &Server{releases: release.NewService(nil, p, nil)}
	result := homeCollection{Items: []homeCollectionItem{}}
	s.homeExplore(context.Background(), "gems", nil, []saved.Title{{TMDBID: 9, Genres: []string{"Драма"}}}, nil, map[int]bool{1: true}, &result)
	if len(result.Items) != 1 || result.Items[0].ID != 7 {
		t.Fatalf("bad gems: %+v", result)
	}
}

func TestHomePeopleMatchesCreditRoleAndExcludesSeenAndUnreleased(t *testing.T) {
	p := &collectionProvider{credits: []release.PersonCredit{
		{TMDBID: 1, MediaType: "movie", Role: "director", ReleaseDate: "2000-01-01"},
		{TMDBID: 2, MediaType: "movie", Role: "actor", ReleaseDate: "2000-01-01"},
		{TMDBID: 3, MediaType: "movie", Role: "director", ReleaseDate: "2099-01-01"},
		{TMDBID: 4, MediaType: "movie", Role: "director", ReleaseDate: "2000-01-01"},
		{TMDBID: 5, MediaType: "tv", Role: "director", ReleaseDate: "2000-01-01"},
	}}
	s := &Server{releases: release.NewService(nil, p, nil)}
	result := homeCollection{Items: []homeCollectionItem{}}
	s.homePeople(context.Background(), "u", []saved.Title{{TMDBID: 10, Title: "Favorite"}}, map[int]release.Details{10: {Directors: []release.CrewMember{{TMDBID: 20, Name: "Director"}}}}, map[int]bool{4: true}, &result)
	if len(result.Items) != 1 || result.Items[0].ID != 1 || result.Items[0].PersonID != 20 {
		t.Fatalf("bad filmography: %+v", result)
	}
}

func TestNewCountryNeverUsesCountriesFromInterestLists(t *testing.T) {
	rows := []saved.Title{{TMDBID: 1, MediaType: "movie", ListTypes: []string{"watched"}}, {TMDBID: 2, MediaType: "movie", ListTypes: []string{"watchlist"}}}
	p := &collectionProvider{details: map[int]release.Details{1: {ID: 1, OriginCountry: []string{"US"}}}}
	s := &Server{releases: release.NewService(nil, p, nil)}
	result := homeCollection{Items: []homeCollectionItem{}}
	s.homeExplore(context.Background(), "country", rows, []saved.Title{{TMDBID: 1, Genres: []string{"Драма"}}}, nil, homeSeen(rows), &result)
	if result.Country == "US" || result.Country == "" || result.PassportIncomplete {
		t.Fatalf("wrong passport: %+v", result)
	}
	// Missing country metadata is explicitly reported rather than claiming a complete passport.
	p.details[1] = release.Details{ID: 1}
	s = &Server{releases: release.NewService(nil, p, nil)}
	result = homeCollection{Items: []homeCollectionItem{}}
	s.homeExplore(context.Background(), "country", rows, []saved.Title{{TMDBID: 1, Genres: []string{"Драма"}}}, nil, homeSeen(rows), &result)
	if !result.PassportIncomplete {
		t.Fatal("missing metadata silently treated as complete passport")
	}
}
