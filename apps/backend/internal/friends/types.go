package friends

import "time"

type Status string

const (
	StatusPending  Status = "pending"
	StatusAccepted Status = "accepted"
	StatusDeclined Status = "declined"
)

type Friendship struct {
	ID          string
	RequesterID string
	AddresseeID string
	Status      Status
	CreatedAt   time.Time
	RespondedAt *time.Time
}

// Summary pairs a friendship row with the *other* user's public info, from
// the perspective of whichever user fetched the list.
type Summary struct {
	Friendship
	FriendUserID  string
	Username      string
	Email         string
	SavedCount    int
	MutualCount   int
	RecentPosters []string
}
