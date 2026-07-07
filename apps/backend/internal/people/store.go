// Package people persists a user's followed film people (actors and directors),
// each scoped to the role they were followed as, with an optional subscription
// to their upcoming releases.
package people

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

// ErrInvalidRole is returned when a follow role is not actor or director.
var ErrInvalidRole = errors.New("invalid role")

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// Follow is one followed person, scoped to a role.
type Follow struct {
	UserID     string
	PersonID   int
	Role       string
	Name       string
	ProfileURL string
	KnownFor   string
	Liked      bool
	Subscribed bool
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

// UpsertInput carries a like/subscribe change for a person+role.
type UpsertInput struct {
	UserID     string
	PersonID   int
	Role       string
	Name       string
	ProfileURL string
	KnownFor   string
	Liked      bool
	Subscribed bool
}

func (s *Store) ListByUser(ctx context.Context, userID string) ([]Follow, error) {
	rows, err := s.db.QueryContext(ctx, `
		select user_id, person_id, role, name, profile_url, known_for,
		       liked, subscribed, created_at, updated_at
		from person_follows
		where user_id = $1
		order by updated_at desc
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Follow, 0)
	for rows.Next() {
		item, err := scanFollow(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

// ListSubscriptions returns every subscribed follow across all users, for the
// release-notification job.
func (s *Store) ListSubscriptions(ctx context.Context) ([]Follow, error) {
	rows, err := s.db.QueryContext(ctx, `
		select user_id, person_id, role, name, profile_url, known_for,
		       liked, subscribed, created_at, updated_at
		from person_follows
		where subscribed
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Follow, 0)
	for rows.Next() {
		item, err := scanFollow(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

func (s *Store) Upsert(ctx context.Context, input UpsertInput) (Follow, error) {
	role := NormalizeRole(input.Role)
	if role == "" {
		return Follow{}, ErrInvalidRole
	}

	var profile sql.NullString
	if strings.TrimSpace(input.ProfileURL) != "" {
		profile = sql.NullString{String: input.ProfileURL, Valid: true}
	}
	var knownFor sql.NullString
	if strings.TrimSpace(input.KnownFor) != "" {
		knownFor = sql.NullString{String: input.KnownFor, Valid: true}
	}

	row := s.db.QueryRowContext(ctx, `
		insert into person_follows (
			user_id, person_id, role, name, profile_url, known_for, liked, subscribed
		)
		values ($1, $2, $3, $4, $5, $6, $7, $8)
		on conflict (user_id, person_id, role)
		do update set
			name = excluded.name,
			profile_url = coalesce(excluded.profile_url, person_follows.profile_url),
			known_for = coalesce(excluded.known_for, person_follows.known_for),
			liked = excluded.liked,
			subscribed = excluded.subscribed,
			updated_at = now()
		returning user_id, person_id, role, name, profile_url, known_for,
		          liked, subscribed, created_at, updated_at
	`,
		input.UserID,
		input.PersonID,
		role,
		strings.TrimSpace(input.Name),
		profile,
		knownFor,
		input.Liked,
		input.Subscribed,
	)

	return scanFollow(row)
}

func (s *Store) Delete(ctx context.Context, userID string, personID int, role string) error {
	role = NormalizeRole(role)
	if role == "" {
		_, err := s.db.ExecContext(ctx, `
			delete from person_follows where user_id = $1 and person_id = $2
		`, userID, personID)
		return err
	}
	_, err := s.db.ExecContext(ctx, `
		delete from person_follows where user_id = $1 and person_id = $2 and role = $3
	`, userID, personID, role)
	return err
}

type scanner interface {
	Scan(dest ...any) error
}

func scanFollow(row scanner) (Follow, error) {
	var item Follow
	var profile sql.NullString
	var knownFor sql.NullString
	if err := row.Scan(
		&item.UserID,
		&item.PersonID,
		&item.Role,
		&item.Name,
		&profile,
		&knownFor,
		&item.Liked,
		&item.Subscribed,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return Follow{}, err
	}
	if profile.Valid {
		item.ProfileURL = profile.String
	}
	if knownFor.Valid {
		item.KnownFor = knownFor.String
	}
	return item, nil
}

// NormalizeRole validates and canonicalises a follow role.
func NormalizeRole(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "actor":
		return "actor"
	case "director":
		return "director"
	default:
		return ""
	}
}
