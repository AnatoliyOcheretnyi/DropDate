package friends

import (
	"context"
	"database/sql"
	"errors"
)

var (
	ErrSelfRequest    = errors.New("cannot friend yourself")
	ErrAlreadyFriends = errors.New("already friends")
	ErrRequestPending = errors.New("request already pending")
	ErrNotFound       = errors.New("friendship not found")
	ErrForbidden      = errors.New("not allowed")
)

type Service struct {
	store *Store
}

func NewService(store *Store) *Service {
	return &Service{store: store}
}

// SendRequest creates a pending request from requesterID to addresseeID, or
// re-opens one that was previously declined. Returns ErrAlreadyFriends /
// ErrRequestPending if a live relationship already exists between the pair.
func (s *Service) SendRequest(ctx context.Context, requesterID, addresseeID string) (Friendship, error) {
	if requesterID == addresseeID {
		return Friendship{}, ErrSelfRequest
	}

	existing, err := s.store.FindPair(ctx, requesterID, addresseeID)
	if errors.Is(err, sql.ErrNoRows) {
		fs, err := s.store.Create(ctx, requesterID, addresseeID)
		if errors.Is(err, ErrUniqueViolation) {
			return s.store.FindPair(ctx, requesterID, addresseeID)
		}
		return fs, err
	}
	if err != nil {
		return Friendship{}, err
	}

	switch existing.Status {
	case StatusAccepted:
		return Friendship{}, ErrAlreadyFriends
	case StatusPending:
		return Friendship{}, ErrRequestPending
	default: // declined — allow a fresh request
		return s.store.Reopen(ctx, existing.ID, requesterID, addresseeID)
	}
}

// Respond accepts or declines an incoming request. Only the addressee may
// respond, and only while it's still pending.
func (s *Service) Respond(ctx context.Context, callerID, friendshipID string, accept bool) (Friendship, error) {
	fs, err := s.store.GetByID(ctx, friendshipID)
	if errors.Is(err, sql.ErrNoRows) {
		return Friendship{}, ErrNotFound
	}
	if err != nil {
		return Friendship{}, err
	}
	if fs.AddresseeID != callerID || fs.Status != StatusPending {
		return Friendship{}, ErrForbidden
	}

	status := StatusDeclined
	if accept {
		status = StatusAccepted
	}
	return s.store.SetStatus(ctx, friendshipID, status)
}

// Remove deletes a friendship — used both to cancel your own outgoing
// request and to unfriend an accepted one. Either party may call it.
func (s *Service) Remove(ctx context.Context, callerID, friendshipID string) error {
	fs, err := s.store.GetByID(ctx, friendshipID)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if fs.RequesterID != callerID && fs.AddresseeID != callerID {
		return ErrForbidden
	}
	return s.store.Delete(ctx, friendshipID)
}

// List buckets every friendship touching userID into three groups from
// their point of view.
func (s *Service) List(ctx context.Context, userID string) (friendsList, incoming, outgoing []Summary, err error) {
	rows, err := s.store.ListForUser(ctx, userID)
	if err != nil {
		return nil, nil, nil, err
	}
	for _, row := range rows {
		switch {
		case row.Status == StatusAccepted:
			friendsList = append(friendsList, row)
		case row.Status == StatusPending && row.AddresseeID == userID:
			incoming = append(incoming, row)
		case row.Status == StatusPending && row.RequesterID == userID:
			outgoing = append(outgoing, row)
		}
	}
	return
}

// IsFriend reports whether two users have an accepted friendship — the gate
// used before handing out another user's saved lists or achievements.
func (s *Service) IsFriend(ctx context.Context, userA, userB string) (bool, error) {
	fs, err := s.store.FindPair(ctx, userA, userB)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return fs.Status == StatusAccepted, nil
}

// RelationshipStatus reports the relationship between viewerID and otherID
// from viewerID's perspective, for driving the right button state in search
// results ("Add" / "Pending" / "Respond" / "Friends").
func (s *Service) RelationshipStatus(ctx context.Context, viewerID, otherID string) (string, error) {
	fs, err := s.store.FindPair(ctx, viewerID, otherID)
	if errors.Is(err, sql.ErrNoRows) {
		return "none", nil
	}
	if err != nil {
		return "", err
	}
	switch fs.Status {
	case StatusAccepted:
		return "accepted", nil
	case StatusPending:
		if fs.RequesterID == viewerID {
			return "pending_outgoing", nil
		}
		return "pending_incoming", nil
	default: // declined — treat as re-requestable
		return "none", nil
	}
}
