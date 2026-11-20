package httpapi

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
)

type homeFeedStub struct {
	upcoming func(context.Context) ([]release.Suggestion, []release.Suggestion, error)
	list     func(context.Context, string) ([]release.Suggestion, error)
}

func (s homeFeedStub) HomeUpcoming(ctx context.Context, _ int) ([]release.Suggestion, []release.Suggestion, error) {
	return s.upcoming(ctx)
}
func (s homeFeedStub) Popular(ctx context.Context, kind string, _ int) ([]release.Suggestion, error) {
	return s.list(ctx, "popular-"+kind)
}
func (s homeFeedStub) TopRated(ctx context.Context, kind string, _ int) ([]release.Suggestion, error) {
	return s.list(ctx, "top-"+kind)
}

func TestHomeFeedSlowUpcomingDoesNotBlockCatalogueRequests(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	started := make(chan struct{}, 4)
	source := homeFeedStub{
		upcoming: func(ctx context.Context) ([]release.Suggestion, []release.Suggestion, error) {
			for i := 0; i < 4; i++ {
				select {
				case <-started:
				case <-ctx.Done():
					return nil, nil, ctx.Err()
				}
			}
			return []release.Suggestion{{ID: 1}}, nil, nil
		},
		list: func(_ context.Context, _ string) ([]release.Suggestion, error) {
			started <- struct{}{}
			return []release.Suggestion{{ID: 2}}, nil
		},
	}
	feed, failures := loadHomeFeed(ctx, source, 18)
	if len(failures) != 0 || len(feed.Upcoming.Movies) != 1 || len(feed.Popular.Series) != 1 {
		t.Fatalf("catalogue requests did not run independently: %+v, %v", feed, failures)
	}
}

func TestHomeFeedKeepsHealthySectionsWhenUpcomingTimesOut(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	source := homeFeedStub{
		upcoming: func(ctx context.Context) ([]release.Suggestion, []release.Suggestion, error) {
			<-ctx.Done()
			// Curated feed can return partial data without an error on timeout.
			return []release.Suggestion{{ID: 1}}, nil, nil
		},
		list: func(_ context.Context, _ string) ([]release.Suggestion, error) {
			return []release.Suggestion{{ID: 2}}, nil
		},
	}
	feed, failures := loadHomeFeed(ctx, source, 18)
	if len(failures) != 1 || !errors.Is(failures["upcoming"], context.DeadlineExceeded) {
		t.Fatalf("missing timeout metadata: %v", failures)
	}
	if len(feed.Popular.Movies) != 1 || len(feed.TopRated.Series) != 1 || len(feed.Upcoming.Movies) != 1 {
		t.Fatalf("successful/partial data was discarded: %+v", feed)
	}
	if len(feed.UnavailableSections) != 1 || feed.UnavailableSections[0] != "upcoming" {
		t.Fatal(feed.UnavailableSections)
	}
}

func TestHomeFeedRecordsAllFailuresWithoutNullArrays(t *testing.T) {
	err := errors.New("upstream unavailable")
	source := homeFeedStub{
		upcoming: func(context.Context) ([]release.Suggestion, []release.Suggestion, error) { return nil, nil, err },
		list:     func(context.Context, string) ([]release.Suggestion, error) { return nil, err },
	}
	feed, failures := loadHomeFeed(context.Background(), source, 18)
	if len(failures) != 5 || len(feed.UnavailableSections) != 5 {
		t.Fatal(failures)
	}
	if feed.Upcoming.Movies == nil || feed.Popular.Series == nil || feed.TopRated.Movies == nil {
		t.Fatal("null catalogue arrays")
	}
}
