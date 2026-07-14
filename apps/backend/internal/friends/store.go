package friends

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
)

// ErrUniqueViolation surfaces a lost race between two concurrent requests for
// the same pair of users (the DB-level unique index catching what the
// application-level FindPair check missed).
var ErrUniqueViolation = errors.New("friendship already exists")

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

func (s *Store) Create(ctx context.Context, requesterID, addresseeID string) (Friendship, error) {
	row := s.db.QueryRowContext(ctx, `
		insert into friendships (requester_id, addressee_id, status)
		values ($1, $2, 'pending')
		returning id, requester_id, addressee_id, status, created_at, responded_at
	`, requesterID, addresseeID)

	fs, err := scanFriendship(row)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return Friendship{}, ErrUniqueViolation
		}
		return Friendship{}, err
	}
	return fs, nil
}

func (s *Store) FindPair(ctx context.Context, a, b string) (Friendship, error) {
	row := s.db.QueryRowContext(ctx, `
		select id, requester_id, addressee_id, status, created_at, responded_at
		from friendships
		where (requester_id = $1 and addressee_id = $2)
		   or (requester_id = $2 and addressee_id = $1)
	`, a, b)
	return scanFriendship(row)
}

func (s *Store) GetByID(ctx context.Context, id string) (Friendship, error) {
	row := s.db.QueryRowContext(ctx, `
		select id, requester_id, addressee_id, status, created_at, responded_at
		from friendships
		where id = $1
	`, id)
	return scanFriendship(row)
}

func (s *Store) SetStatus(ctx context.Context, id string, status Status) (Friendship, error) {
	row := s.db.QueryRowContext(ctx, `
		update friendships
		set status = $2, responded_at = now()
		where id = $1
		returning id, requester_id, addressee_id, status, created_at, responded_at
	`, id, status)
	return scanFriendship(row)
}

// Reopen re-sends a previously declined request: the row is reused (keeping
// its id stable) with a fresh requester/addressee pair and cleared response.
func (s *Store) Reopen(ctx context.Context, id, requesterID, addresseeID string) (Friendship, error) {
	row := s.db.QueryRowContext(ctx, `
		update friendships
		set status = 'pending', requester_id = $2, addressee_id = $3,
		    responded_at = null, created_at = now()
		where id = $1
		returning id, requester_id, addressee_id, status, created_at, responded_at
	`, id, requesterID, addresseeID)
	return scanFriendship(row)
}

func (s *Store) Delete(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `delete from friendships where id = $1`, id)
	return err
}

// ListForUser returns every friendship row (any status) involving userID,
// joined with the *other* party's public info plus the profile-card extras:
// their library size, how many titles they share with the caller, and a few
// recent poster URLs for the card's artwork strip.
func (s *Store) ListForUser(ctx context.Context, userID string) ([]Summary, error) {
	rows, err := s.db.QueryContext(ctx, `
		select
			f.id, f.requester_id, f.addressee_id, f.status, f.created_at, f.responded_at,
			u.id, u.username, u.email,
			coalesce(sc.cnt, 0),
			coalesce(mc.cnt, 0),
			rp.posters
		from friendships f
		join users u on u.id = case when f.requester_id = $1 then f.addressee_id else f.requester_id end
		left join lateral (
			select count(*) as cnt from saved_titles st where st.user_id = u.id
		) sc on true
		left join lateral (
			select count(*) as cnt
			from saved_titles a
			join saved_titles b
			  on b.user_id = u.id and b.tmdb_id = a.tmdb_id and b.media_type = a.media_type
			where a.user_id = $1
		) mc on true
		left join lateral (
			select string_agg(p.poster_url, e'\n') as posters
			from (
				select st.poster_url
				from saved_titles st
				where st.user_id = u.id and coalesce(st.poster_url, '') <> ''
				order by st.updated_at desc
				limit 4
			) p
		) rp on true
		where f.requester_id = $1 or f.addressee_id = $1
		order by f.created_at desc
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Summary
	for rows.Next() {
		var sm Summary
		var responded sql.NullTime
		var username sql.NullString
		var posters sql.NullString
		if err := rows.Scan(
			&sm.ID, &sm.RequesterID, &sm.AddresseeID, &sm.Status, &sm.CreatedAt, &responded,
			&sm.FriendUserID, &username, &sm.Email, &sm.SavedCount, &sm.MutualCount, &posters,
		); err != nil {
			return nil, err
		}
		if responded.Valid {
			sm.RespondedAt = &responded.Time
		}
		sm.Username = username.String
		if posters.Valid && posters.String != "" {
			sm.RecentPosters = strings.Split(posters.String, "\n")
		}
		out = append(out, sm)
	}
	return out, rows.Err()
}

func scanFriendship(row *sql.Row) (Friendship, error) {
	var fs Friendship
	var responded sql.NullTime
	if err := row.Scan(&fs.ID, &fs.RequesterID, &fs.AddresseeID, &fs.Status, &fs.CreatedAt, &responded); err != nil {
		return Friendship{}, err
	}
	if responded.Valid {
		fs.RespondedAt = &responded.Time
	}
	return fs, nil
}
