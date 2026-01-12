package release

import (
	"context"
	"errors"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/tmdb"
)

// ReleaseProvider повертає наступний реліз для конкретного джерела.
type ReleaseProvider interface {
	Name() string
	NextRelease(ctx context.Context, title string) (Info, error)
}

// SuggestionProvider формує підказки для автодоповнення.
type SuggestionProvider interface {
	Name() string
	Suggestions(ctx context.Context, query string, limit int) ([]Suggestion, error)
}

// NewTMDBProvider адаптує tmdb.Client до ReleaseProvider.
func NewTMDBProvider(client *tmdb.Client) ReleaseProvider {
	if client == nil {
		return nil
	}
	return &tmdbReleaseProvider{client: client}
}

type tmdbReleaseProvider struct {
	client *tmdb.Client
}

func (p *tmdbReleaseProvider) Name() string {
	return "tmdb"
}

func (p *tmdbReleaseProvider) NextRelease(ctx context.Context, title string) (Info, error) {
	info, err := p.client.NextRelease(ctx, title)
	if err != nil {
		if errors.Is(err, tmdb.ErrNotFound) {
			return Info{}, ErrNotFound
		}
		return Info{}, err
	}

	return Info{
		Title:       info.Title,
		Type:        info.Type,
		NextRelease: info.NextRelease,
		Source:      info.Source,
		PosterURL:   info.PosterURL,
		BackdropURL: info.BackdropURL,
		Status:      info.Status,
	}, nil
}

func (p *tmdbReleaseProvider) LookupByID(ctx context.Context, id int, mediaType string) (Info, error) {
	info, err := p.client.LookupByID(ctx, id, mediaType)
	if err != nil {
		if errors.Is(err, tmdb.ErrNotFound) {
			return Info{}, ErrNotFound
		}
		return Info{}, err
	}

	return Info{
		Title:       info.Title,
		Type:        info.Type,
		NextRelease: info.NextRelease,
		Source:      info.Source,
		PosterURL:   info.PosterURL,
		BackdropURL: info.BackdropURL,
		Status:      info.Status,
	}, nil
}

// NewTMDBSuggestionProvider створює SuggestionProvider поверх TMDB.
func NewTMDBSuggestionProvider(client *tmdb.Client) SuggestionProvider {
	if client == nil {
		return nil
	}
	return &tmdbSuggestionProvider{client: client}
}

type tmdbSuggestionProvider struct {
	client *tmdb.Client
}

func (p *tmdbSuggestionProvider) Name() string {
	return "tmdb"
}

func (p *tmdbSuggestionProvider) Suggestions(ctx context.Context, query string, limit int) ([]Suggestion, error) {
	results, err := p.client.Suggestions(ctx, query, limit)
	if err != nil {
		return nil, err
	}

	out := make([]Suggestion, 0, len(results))
	for _, res := range results {
		out = append(out, Suggestion{
			ID:        res.ID,
			Title:     res.Title,
			MediaType: res.MediaType,
			Year:      res.Year,
			PosterURL: res.PosterURL,
		})
	}

	return out, nil
}

func (p *tmdbSuggestionProvider) Trending(ctx context.Context, window string, limit int) ([]Suggestion, error) {
	results, err := p.client.Trending(ctx, window, limit)
	if err != nil {
		return nil, err
	}

	out := make([]Suggestion, 0, len(results))
	for _, res := range results {
		out = append(out, Suggestion{
			ID:        res.ID,
			Title:     res.Title,
			MediaType: res.MediaType,
			Year:      res.Year,
			PosterURL: res.PosterURL,
		})
	}

	return out, nil
}

func (p *tmdbSuggestionProvider) TrendingByType(
	ctx context.Context,
	mediaType string,
	window string,
	limit int,
) ([]Suggestion, error) {
	results, err := p.client.TrendingByType(ctx, mediaType, window, limit)
	if err != nil {
		return nil, err
	}

	out := make([]Suggestion, 0, len(results))
	for _, res := range results {
		out = append(out, Suggestion{
			ID:        res.ID,
			Title:     res.Title,
			MediaType: res.MediaType,
			Year:      res.Year,
			PosterURL: res.PosterURL,
		})
	}

	return out, nil
}

func (p *tmdbSuggestionProvider) Search(ctx context.Context, query string, page int) (SearchResults, error) {
	results, err := p.client.SearchAll(ctx, query, page)
	if err != nil {
		return SearchResults{}, err
	}

	out := make([]Suggestion, 0, len(results.Results))
	for _, res := range results.Results {
		out = append(out, Suggestion{
			ID:        res.ID,
			Title:     res.Title,
			MediaType: res.MediaType,
			Year:      res.Year,
			PosterURL: res.PosterURL,
		})
	}

	return SearchResults{
		Results:      out,
		Page:         results.Page,
		TotalPages:   results.TotalPages,
		TotalResults: results.TotalResults,
	}, nil
}

func (p *tmdbSuggestionProvider) Details(ctx context.Context, id int, mediaType string) (Details, error) {
	info, err := p.client.DetailsByID(ctx, id, mediaType)
	if err != nil {
		if errors.Is(err, tmdb.ErrNotFound) {
			return Details{}, ErrNotFound
		}
		return Details{}, err
	}

	return Details{
		ID:                info.ID,
		Title:             info.Title,
		MediaType:         info.MediaType,
		Overview:          info.Overview,
		Tagline:           info.Tagline,
		PosterURL:         info.PosterURL,
		BackdropURL:       info.BackdropURL,
		Status:            info.Status,
		ReleaseDate:       info.ReleaseDate,
		FirstAirDate:      info.FirstAirDate,
		LastAirDate:       info.LastAirDate,
		NextAirDate:       info.NextAirDate,
		NextEpisode:       info.NextEpisode,
		NextEpisodeSeason: info.NextEpisodeSeason,
		NextEpisodeNumber: info.NextEpisodeNumber,
		LastEpisode:       info.LastEpisode,
		LastEpisodeSeason: info.LastEpisodeSeason,
		LastEpisodeNumber: info.LastEpisodeNumber,
		SeasonCount:       info.SeasonCount,
		EpisodeCount:      info.EpisodeCount,
		Runtime:           info.Runtime,
		Genres:            info.Genres,
		Networks:          info.Networks,
		VoteAverage:       info.VoteAverage,
		VoteCount:         info.VoteCount,
		Popularity:        info.Popularity,
		Homepage:          info.Homepage,
		OriginCountry:     info.OriginCountry,
	}, nil
}

func (p *tmdbSuggestionProvider) Recommendations(
	ctx context.Context,
	id int,
	mediaType string,
	limit int,
) ([]Suggestion, error) {
	results, err := p.client.Recommendations(ctx, id, mediaType, limit)
	if err != nil {
		return nil, err
	}

	out := make([]Suggestion, 0, len(results))
	for _, res := range results {
		out = append(out, Suggestion{
			ID:        res.ID,
			Title:     res.Title,
			MediaType: res.MediaType,
			Year:      res.Year,
			PosterURL: res.PosterURL,
		})
	}

	return out, nil
}
