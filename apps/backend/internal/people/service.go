package people

import "context"

type Service struct {
	store *Store
}

func NewService(store *Store) *Service {
	return &Service{store: store}
}

func (s *Service) List(ctx context.Context, userID string) ([]Follow, error) {
	return s.store.ListByUser(ctx, userID)
}

func (s *Service) Subscriptions(ctx context.Context) ([]Follow, error) {
	return s.store.ListSubscriptions(ctx)
}

func (s *Service) Upsert(ctx context.Context, input UpsertInput) (Follow, error) {
	return s.store.Upsert(ctx, input)
}

func (s *Service) Remove(ctx context.Context, userID string, personID int, role string) error {
	return s.store.Delete(ctx, userID, personID, role)
}
