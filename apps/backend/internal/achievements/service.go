package achievements

import (
	"context"
	"log"
	"sort"
)

// Tiers is the shared threshold ladder used by every list. Ordered ascending;
// callers rely on that order to find the "next" tier.
var Tiers = []int{1, 10, 50, 100, 200, 500, 1000}

// ListKeys are every ladder tracked: the six real list types plus the
// synthetic "total" ladder (favorite+liked+watched+disliked combined).
var ListKeys = []string{"total", "follow", "watchlist", "favorite", "liked", "watched", "disliked"}

func isStatusListType(listType string) bool {
	switch listType {
	case "favorite", "liked", "watched", "disliked":
		return true
	default:
		return false
	}
}

type Service struct {
	store  *Store
	logger *log.Logger
}

func NewService(store *Store, logger *log.Logger) *Service {
	if logger == nil {
		logger = log.Default()
	}
	return &Service{store: store, logger: logger}
}

// ListProgress is one ladder's state for a user, shaped for the profile screen.
type ListProgress struct {
	ListKey       string `json:"listKey"`
	Count         int    `json:"count"`
	UnlockedTiers []int  `json:"unlockedTiers"`
	NextTier      int    `json:"nextTier,omitempty"`
}

// UnlockedEvent is one tier a save action just newly unlocked, returned
// inline so the frontend can show a celebratory moment without polling.
type UnlockedEvent struct {
	ListKey string `json:"listKey"`
	Tier    int    `json:"tier"`
}

// Snapshot returns every ladder's current progress for a user. It also
// reconciles: a user's live count may already have crossed tiers that were
// never recorded (titles saved before this feature shipped, or added
// through a path that predates RecordProgress). Backfilling here means
// historical data self-heals the first time the profile is opened, with no
// separate migration script.
func (s *Service) Snapshot(ctx context.Context, userID string) ([]ListProgress, error) {
	counts, err := s.store.CurrentCounts(ctx, userID)
	if err != nil {
		return nil, err
	}
	unlocked, err := s.store.UnlockedTiers(ctx, userID)
	if err != nil {
		return nil, err
	}
	if _, err := s.unlockReached(ctx, userID, ListKeys, counts, unlocked); err != nil {
		return nil, err
	}

	out := make([]ListProgress, 0, len(ListKeys))
	for _, key := range ListKeys {
		tiers := append([]int(nil), unlocked[key]...)
		sort.Ints(tiers)
		out = append(out, ListProgress{
			ListKey:       key,
			Count:         counts[key],
			UnlockedTiers: tiers,
			NextTier:      nextTier(tiers),
		})
	}
	return out, nil
}

// RecordProgress re-checks the ladders affected by adding a title to
// listType (that ladder, plus "total" when listType is a status list) and
// permanently unlocks any tier the live count has newly reached. Only
// additions call this — removals lower the live count (reflected in
// Snapshot's progress) but never revoke an already-unlocked tier.
func (s *Service) RecordProgress(ctx context.Context, userID string, listType string) ([]UnlockedEvent, error) {
	affected := []string{listType}
	if isStatusListType(listType) {
		affected = append(affected, "total")
	}

	counts, err := s.store.CurrentCounts(ctx, userID)
	if err != nil {
		return nil, err
	}
	unlocked, err := s.store.UnlockedTiers(ctx, userID)
	if err != nil {
		return nil, err
	}

	return s.unlockReached(ctx, userID, affected, counts, unlocked)
}

// unlockReached compares live counts against already-unlocked tiers for the
// given list keys and persists any newly-reached tier (idempotent — ON
// CONFLICT DO NOTHING at the store level). unlocked is updated in place so
// callers see the reconciled state immediately without a second read.
func (s *Service) unlockReached(
	ctx context.Context,
	userID string,
	keys []string,
	counts map[string]int,
	unlocked map[string][]int,
) ([]UnlockedEvent, error) {
	var newlyUnlocked []UnlockedEvent
	for _, key := range keys {
		already := toSet(unlocked[key])
		for _, tier := range Tiers {
			if tier > counts[key] {
				break
			}
			if already[tier] {
				continue
			}
			if err := s.store.Unlock(ctx, userID, key, tier); err != nil {
				return nil, err
			}
			unlocked[key] = append(unlocked[key], tier)
			already[tier] = true
			newlyUnlocked = append(newlyUnlocked, UnlockedEvent{ListKey: key, Tier: tier})
		}
	}
	return newlyUnlocked, nil
}

// nextTier finds the smallest tier above the highest unlocked one. unlocked
// is expected sorted ascending. Returns 0 once every tier is unlocked.
func nextTier(unlocked []int) int {
	top := 0
	if len(unlocked) > 0 {
		top = unlocked[len(unlocked)-1]
	}
	for _, tier := range Tiers {
		if tier > top {
			return tier
		}
	}
	return 0
}

func toSet(values []int) map[int]bool {
	set := make(map[int]bool, len(values))
	for _, v := range values {
		set[v] = true
	}
	return set
}
