package akinator

import (
	"context"
	"strconv"
	"sync"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/tmdb"
)

const defaultDatasetSize = 4000
const initialSnapshotSize = 50

type MovieSource interface {
	Discover(context.Context, tmdb.DiscoverParams) ([]tmdb.DiscoverItem, error)
	MovieFeatures(context.Context, int) (tmdb.MovieFeatureInfo, error)
}

type Builder struct {
	source  MovieSource
	store   *Store
	service *Service
}

func NewBuilder(source MovieSource, store *Store, service *Service) *Builder {
	return &Builder{source: source, store: store, service: service}
}

func (b *Builder) Refresh(ctx context.Context, limit int) (int, error) {
	if limit <= 0 || limit > defaultDatasetSize {
		limit = defaultDatasetSize
	}
	ids := make([]int, 0, limit)
	seen := make(map[int]bool, limit)
	for page := 1; len(ids) < limit; page++ {
		items, err := b.source.Discover(ctx, tmdb.DiscoverParams{MediaType: "movie", SortBy: "popularity.desc", VoteCountGTE: 50, Page: page})
		if err != nil {
			return len(ids), err
		}
		if len(items) == 0 {
			break
		}
		for _, item := range items {
			if !seen[item.ID] {
				seen[item.ID] = true
				ids = append(ids, item.ID)
			}
			if len(ids) == limit {
				break
			}
		}
	}

	tasks := make(chan int)
	errCh := make(chan error, 1)
	var wg sync.WaitGroup
	var mu sync.Mutex
	var initialReload sync.Once
	written := 0
	worker := func() {
		defer wg.Done()
		for id := range tasks {
			info, err := b.source.MovieFeatures(ctx, id)
			if err != nil {
				select {
				case errCh <- err:
				default:
				}
				continue
			}
			movie := movieFromTMDB(info)
			if err := b.store.Upsert(ctx, movie); err != nil {
				select {
				case errCh <- err:
				default:
				}
				continue
			}
			mu.Lock()
			written++
			currentWritten := written
			mu.Unlock()
			if currentWritten >= initialSnapshotSize {
				initialReload.Do(func() {
					if err := b.service.Reload(ctx); err != nil {
						select {
						case errCh <- err:
						default:
						}
					}
				})
			}
		}
	}
	for i := 0; i < 6; i++ {
		wg.Add(1)
		go worker()
	}
sendLoop:
	for _, id := range ids {
		select {
		case tasks <- id:
		case <-ctx.Done():
			break sendLoop
		}
	}
	close(tasks)
	wg.Wait()
	var firstErr error
	select {
	case firstErr = <-errCh:
	default:
	}
	if written == 0 && firstErr != nil {
		return 0, firstErr
	}
	if err := b.service.Reload(ctx); err != nil {
		return written, err
	}
	return written, nil
}

func movieFromTMDB(info tmdb.MovieFeatureInfo) Movie {
	year := 0
	if len(info.ReleaseDate) >= 4 {
		year, _ = strconv.Atoi(info.ReleaseDate[:4])
	}
	convert := func(items []tmdb.NamedRef) []NamedRef {
		out := make([]NamedRef, 0, len(items))
		for _, item := range items {
			out = append(out, NamedRef{ID: item.ID, Name: item.Name})
		}
		return out
	}
	return Movie{TMDBID: info.ID, Title: info.Title, Year: year, PosterURL: info.PosterURL, BackdropURL: info.BackdropURL,
		Popularity: info.Popularity, VoteAverage: info.VoteAverage, VoteCount: info.VoteCount, Runtime: info.Runtime,
		OriginalLanguage: info.OriginalLanguage, IsFranchise: info.IsFranchise, OriginCountries: info.OriginCountry,
		GenreIDs: info.GenreIDs, Keywords: convert(info.Keywords), Cast: convert(info.Cast), Directors: convert(info.Directors)}
}
