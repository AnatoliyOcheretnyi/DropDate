package release

import (
	"context"
	"errors"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/tmdb"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/tvmaze"
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

// NewTVMazeProvider адаптує tvmaze.Client під ReleaseProvider.
func NewTVMazeProvider(client *tvmaze.Client) ReleaseProvider {
	if client == nil {
		return nil
	}
	return &tvmazeProvider{client: client}
}

type tvmazeProvider struct {
	client *tvmaze.Client
}

func (p *tvmazeProvider) Name() string {
	return "tvmaze"
}

func (p *tvmazeProvider) NextRelease(ctx context.Context, title string) (Info, error) {
	info, err := p.client.NextRelease(ctx, title)
	if err != nil {
		if errors.Is(err, tvmaze.ErrNotFound) {
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
		Status:      info.Status,
	}, nil
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
