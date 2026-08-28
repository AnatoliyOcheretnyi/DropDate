package httpapi

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/episodes"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
)

var today = time.Date(2026, 8, 29, 0, 0, 0, 0, time.UTC)

type stubSeasons struct {
	seasons map[int][]release.Episode
	fail    map[int]error
	calls   int
}

func (s *stubSeasons) SeasonEpisodes(_ context.Context, _, seasonNumber int) ([]release.Episode, error) {
	s.calls++
	if err, ok := s.fail[seasonNumber]; ok {
		return nil, err
	}
	season, ok := s.seasons[seasonNumber]
	if !ok {
		return nil, release.ErrNotFound
	}
	return season, nil
}

func airedSeason(count int) []release.Episode {
	out := make([]release.Episode, 0, count)
	for i := 1; i <= count; i++ {
		out = append(out, release.Episode{
			EpisodeNumber: i,
			AirDate:       today.AddDate(0, 0, -count+i-1).Format("2006-01-02"),
		})
	}
	return out
}

func item(season, episode int) episodes.ContinueItem {
	return episodes.ContinueItem{TMDBID: 1, SeasonNumber: season, EpisodeNumber: episode}
}

func TestValidateContinueDropsAFinishedSeries(t *testing.T) {
	// Ten aired episodes, all watched: the stored pointer is at a non-existent
	// eleventh and there is no second season. The card has to go.
	seasons := &stubSeasons{seasons: map[int][]release.Episode{1: airedSeason(10)}}

	got := validateContinueItems(context.Background(), seasons, []episodes.ContinueItem{item(1, 11)}, today)

	if len(got) != 0 {
		t.Fatalf("expected the finished series to be dropped, got %+v", got)
	}
}

func TestValidateContinueKeepsAnAiredNextEpisode(t *testing.T) {
	seasons := &stubSeasons{seasons: map[int][]release.Episode{1: airedSeason(10)}}

	got := validateContinueItems(context.Background(), seasons, []episodes.ContinueItem{item(1, 6)}, today)

	if len(got) != 1 || got[0].EpisodeNumber != 6 {
		t.Fatalf("expected episode 6 to stay, got %+v", got)
	}
	if got[0].EpisodeCount != 10 {
		t.Fatalf("season length = %d, want 10", got[0].EpisodeCount)
	}
}

func TestValidateContinueHidesAnEpisodeThatHasNotAired(t *testing.T) {
	// TMDB lists announced episodes months ahead; a date is not something to
	// watch tonight.
	season := airedSeason(5)
	season = append(season, release.Episode{
		EpisodeNumber: 6,
		AirDate:       today.AddDate(0, 0, 7).Format("2006-01-02"),
	})
	seasons := &stubSeasons{seasons: map[int][]release.Episode{1: season}}

	got := validateContinueItems(context.Background(), seasons, []episodes.ContinueItem{item(1, 6)}, today)

	if len(got) != 0 {
		t.Fatalf("expected an unaired episode to be hidden, got %+v", got)
	}
}

func TestValidateContinueRollsOverIntoAnAiredNextSeason(t *testing.T) {
	seasons := &stubSeasons{seasons: map[int][]release.Episode{
		1: airedSeason(10),
		2: airedSeason(3),
	}}

	got := validateContinueItems(context.Background(), seasons, []episodes.ContinueItem{item(1, 11)}, today)

	if len(got) != 1 {
		t.Fatalf("expected the item to roll over, got %+v", got)
	}
	if got[0].SeasonNumber != 2 || got[0].EpisodeNumber != 1 {
		t.Fatalf("rolled over to S%dE%d, want S2E1", got[0].SeasonNumber, got[0].EpisodeNumber)
	}
	if got[0].WatchedCount != 0 || got[0].EpisodeCount != 3 {
		t.Fatalf("progress should follow the new season, got %+v", got[0])
	}
}

func TestValidateContinueWaitsForTheNextSeasonToStartAiring(t *testing.T) {
	// The season exists on TMDB, announced only. The card returns on release day.
	seasons := &stubSeasons{seasons: map[int][]release.Episode{
		1: airedSeason(10),
		2: {{EpisodeNumber: 1, AirDate: today.AddDate(0, 1, 0).Format("2006-01-02")}},
	}}

	got := validateContinueItems(context.Background(), seasons, []episodes.ContinueItem{item(1, 11)}, today)

	if len(got) != 0 {
		t.Fatalf("expected the item to wait for the premiere, got %+v", got)
	}
}

func TestValidateContinueKeepsItemsWhenTMDBIsDown(t *testing.T) {
	// A transient failure must not empty the rail.
	seasons := &stubSeasons{fail: map[int]error{1: errors.New("boom")}}

	got := validateContinueItems(context.Background(), seasons, []episodes.ContinueItem{item(1, 4)}, today)

	if len(got) != 1 {
		t.Fatalf("expected the item to survive a transient failure, got %+v", got)
	}
}
