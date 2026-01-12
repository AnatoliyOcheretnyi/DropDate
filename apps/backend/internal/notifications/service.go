package notifications

import "context"

type Service struct {
	store *Store
}

func NewService(store *Store) *Service {
	return &Service{store: store}
}

func (s *Service) List(ctx context.Context, userID string, limit int) ([]Notification, error) {
	return s.store.ListByUser(ctx, userID, limit)
}

func (s *Service) CountUnread(ctx context.Context, userID string) (int, error) {
	return s.store.CountUnread(ctx, userID)
}

func (s *Service) MarkRead(ctx context.Context, userID string, ids []string) error {
	return s.store.MarkRead(ctx, userID, ids)
}

func (s *Service) MarkAllRead(ctx context.Context, userID string) error {
	return s.store.MarkAllRead(ctx, userID)
}

func (s *Service) CreateIfMissing(ctx context.Context, input CreateInput) (bool, error) {
	_, created, err := s.store.Create(ctx, input)
	return created, err
}
