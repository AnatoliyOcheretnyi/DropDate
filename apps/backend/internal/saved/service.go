package saved

import "context"

type Service struct {
	store *Store
}

func NewService(store *Store) *Service {
	return &Service{store: store}
}

func (s *Service) List(ctx context.Context, userID string) ([]Title, error) {
	return s.store.ListByUser(ctx, userID)
}

func (s *Service) Upsert(ctx context.Context, input UpsertInput) (Title, error) {
	return s.store.Upsert(ctx, input)
}

func (s *Service) Remove(ctx context.Context, userID string, tmdbID int, mediaType string) error {
	return s.store.Delete(ctx, userID, tmdbID, mediaType)
}
