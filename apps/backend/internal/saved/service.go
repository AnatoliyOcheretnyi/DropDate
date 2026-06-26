package saved

import (
	"context"
	"time"
)

type Service struct {
	store *Store
}

func NewService(store *Store) *Service {
	return &Service{store: store}
}

func (s *Service) List(ctx context.Context, userID string, listType string) ([]Title, error) {
	return s.store.ListByUser(ctx, userID, listType)
}

func (s *Service) ListFollowSubscriptions(ctx context.Context) ([]FollowItem, error) {
	return s.store.ListFollowSubscriptions(ctx)
}

// SeedRows returns every saved row for a user without grouping, so callers can
// derive recommendation seeds and exclusions from per-list signals.
func (s *Service) SeedRows(ctx context.Context, userID string) ([]Title, error) {
	return s.store.ListAllRows(ctx, userID)
}

func (s *Service) Upsert(ctx context.Context, input UpsertInput) (Title, error) {
	if isStatusListType(input.ListType) {
		if err := s.store.RemoveStatusLists(ctx, input.UserID, input.TMDBID, input.MediaType, input.ListType); err != nil {
			return Title{}, err
		}
	}
	return s.store.Upsert(ctx, input)
}

func (s *Service) Remove(ctx context.Context, userID string, tmdbID int, mediaType string, listType string) error {
	return s.store.Delete(ctx, userID, tmdbID, mediaType, listType)
}

func (s *Service) UpdateStats(
	ctx context.Context,
	userID string,
	tmdbID int,
	mediaType string,
	listType string,
	userRating *int,
	watchCount *int,
	lastWatched *time.Time,
) error {
	return s.store.UpdateStats(ctx, userID, tmdbID, mediaType, listType, userRating, watchCount, lastWatched)
}

func isStatusListType(listType string) bool {
	switch normalizeListType(listType) {
	case "favorite", "watched", "disliked":
		return true
	default:
		return false
	}
}
