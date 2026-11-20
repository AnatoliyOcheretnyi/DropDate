package httpapi

import (
	"context"
	"sync"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
)

type homeFeedSource interface {
	HomeUpcoming(context.Context, int) ([]release.Suggestion, []release.Suggestion, error)
	Popular(context.Context, string, int) ([]release.Suggestion, error)
	TopRated(context.Context, string, int) ([]release.Suggestion, error)
}

type homeFeedGroup struct {
	Movies []release.Suggestion `json:"movies"`
	Series []release.Suggestion `json:"series"`
}

type homeFeed struct {
	Upcoming            homeFeedGroup `json:"upcoming"`
	Popular             homeFeedGroup `json:"popular"`
	TopRated            homeFeedGroup `json:"topRated"`
	UnavailableSections []string      `json:"unavailableSections,omitempty"`
}

func (f homeFeed) hasItems() bool {
	return len(f.Upcoming.Movies)+len(f.Upcoming.Series)+len(f.Popular.Movies)+
		len(f.Popular.Series)+len(f.TopRated.Movies)+len(f.TopRated.Series) > 0
}

// Each worker owns a separate result slot. The request context bounds upstream
// calls; a failed section never cancels healthy siblings.
func loadHomeFeed(ctx context.Context, source homeFeedSource, limit int) (homeFeed, map[string]error) {
	type result struct {
		items, series []release.Suggestion
		err           error
	}
	var results [5]result
	jobs := []func() result{
		func() result {
			movies, series, err := source.HomeUpcoming(ctx, limit)
			// HomeUpcoming may return the items collected before cancellation.
			if err == nil {
				err = ctx.Err()
			}
			return result{movies, series, err}
		},
		func() result {
			items, err := source.Popular(ctx, "movie", limit)
			return result{items: items, err: err}
		},
		func() result { items, err := source.Popular(ctx, "tv", limit); return result{items: items, err: err} },
		func() result {
			items, err := source.TopRated(ctx, "movie", limit)
			return result{items: items, err: err}
		},
		func() result { items, err := source.TopRated(ctx, "tv", limit); return result{items: items, err: err} },
	}
	var wg sync.WaitGroup
	for i, job := range jobs {
		wg.Add(1)
		go func(i int, job func() result) { defer wg.Done(); results[i] = job() }(i, job)
	}
	wg.Wait()
	feed := homeFeed{
		Upcoming: homeFeedGroup{nonNilSuggestions(results[0].items), nonNilSuggestions(results[0].series)},
		Popular:  homeFeedGroup{nonNilSuggestions(results[1].items), nonNilSuggestions(results[2].items)},
		TopRated: homeFeedGroup{nonNilSuggestions(results[3].items), nonNilSuggestions(results[4].items)},
	}
	failures := make(map[string]error)
	for i, name := range []string{"upcoming", "popularMovies", "popularSeries", "topRatedMovies", "topRatedSeries"} {
		if results[i].err != nil {
			failures[name] = results[i].err
			feed.UnavailableSections = append(feed.UnavailableSections, name)
		}
	}
	return feed, failures
}

func nonNilSuggestions(items []release.Suggestion) []release.Suggestion {
	if items == nil {
		return []release.Suggestion{}
	}
	return items
}
