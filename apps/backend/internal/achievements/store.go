package achievements

import (
	"context"
	"database/sql"
)

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// CurrentCounts returns the live count for every real list type plus a
// synthetic "total" entry — the combined count across the mutually-exclusive
// status lists (favorite/liked/watched/disliked). follow and watchlist are
// intent signals, not verdicts, so they are deliberately excluded from total.
func (s *Store) CurrentCounts(ctx context.Context, userID string) (map[string]int, error) {
	rows, err := s.db.QueryContext(ctx, `
		select list_type, count(*)
		from saved_titles
		where user_id = $1
		group by list_type
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[string]int, len(ListKeys))
	total := 0
	for rows.Next() {
		var listType string
		var count int
		if err := rows.Scan(&listType, &count); err != nil {
			return nil, err
		}
		counts[listType] = count
		if isStatusListType(listType) {
			total += count
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	counts["total"] = total
	return counts, nil
}

// UnlockedTiers returns every tier a user has ever permanently unlocked, keyed
// by list key. A tier here is never revoked even if the live count later
// drops back below its threshold.
func (s *Store) UnlockedTiers(ctx context.Context, userID string) (map[string][]int, error) {
	rows, err := s.db.QueryContext(ctx, `
		select list_key, tier from user_achievement_unlocks where user_id = $1
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make(map[string][]int)
	for rows.Next() {
		var listKey string
		var tier int
		if err := rows.Scan(&listKey, &tier); err != nil {
			return nil, err
		}
		out[listKey] = append(out[listKey], tier)
	}
	return out, rows.Err()
}

// Unlock permanently records that a user has reached a tier on a ladder.
// Idempotent: unlocking an already-unlocked tier is a no-op.
func (s *Store) Unlock(ctx context.Context, userID string, listKey string, tier int) error {
	_, err := s.db.ExecContext(ctx, `
		insert into user_achievement_unlocks (user_id, list_key, tier)
		values ($1, $2, $3)
		on conflict (user_id, list_key, tier) do nothing
	`, userID, listKey, tier)
	return err
}
