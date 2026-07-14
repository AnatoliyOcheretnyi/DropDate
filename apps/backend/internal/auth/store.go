package auth

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
)

type UserStore struct {
	db *sql.DB
}

func NewUserStore(db *sql.DB) *UserStore {
	return &UserStore{db: db}
}

func (s *UserStore) Create(ctx context.Context, email, passwordHash string) (User, error) {
	row := s.db.QueryRowContext(ctx, `
		insert into users (email, password_hash)
		values ($1, $2)
		returning id, email, username, created_at, email_verified_at
	`, email, passwordHash)

	var user User
	var username sql.NullString
	var verifiedAt sql.NullTime
	if err := row.Scan(&user.ID, &user.Email, &username, &user.CreatedAt, &verifiedAt); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return User{}, ErrEmailExists
		}
		return User{}, err
	}
	user.Username = username.String
	if verifiedAt.Valid {
		user.EmailVerifiedAt = &verifiedAt.Time
	}
	return user, nil
}

func (s *UserStore) GetByEmail(ctx context.Context, email string) (User, string, error) {
	row := s.db.QueryRowContext(ctx, `
		select id, email, username, password_hash, created_at, email_verified_at
		from users
		where email = $1
	`, email)

	var user User
	var username sql.NullString
	var hash string
	var verifiedAt sql.NullTime
	if err := row.Scan(&user.ID, &user.Email, &username, &hash, &user.CreatedAt, &verifiedAt); err != nil {
		return User{}, "", err
	}
	user.Username = username.String
	if verifiedAt.Valid {
		user.EmailVerifiedAt = &verifiedAt.Time
	}
	return user, hash, nil
}

func (s *UserStore) GetByID(ctx context.Context, id string) (User, error) {
	row := s.db.QueryRowContext(ctx, `
		select id, email, username, created_at, email_verified_at
		from users
		where id = $1
	`, id)

	var user User
	var username sql.NullString
	var verifiedAt sql.NullTime
	if err := row.Scan(&user.ID, &user.Email, &username, &user.CreatedAt, &verifiedAt); err != nil {
		return User{}, err
	}
	user.Username = username.String
	if verifiedAt.Valid {
		user.EmailVerifiedAt = &verifiedAt.Time
	}
	return user, nil
}

// FindByUsernameOrEmail matches an exact (case-insensitive) username or
// email — used to resolve a friend-request target from a search query.
func (s *UserStore) FindByUsernameOrEmail(ctx context.Context, query string) (User, error) {
	row := s.db.QueryRowContext(ctx, `
		select id, email, username, created_at, email_verified_at
		from users
		where lower(email) = lower($1) or lower(username) = lower($1)
		limit 1
	`, query)

	var user User
	var username sql.NullString
	var verifiedAt sql.NullTime
	if err := row.Scan(&user.ID, &user.Email, &username, &user.CreatedAt, &verifiedAt); err != nil {
		return User{}, err
	}
	user.Username = username.String
	if verifiedAt.Valid {
		user.EmailVerifiedAt = &verifiedAt.Time
	}
	return user, nil
}

// SearchUsers finds candidates for the friend-search typeahead: usernames
// prefix-matching query, plus an exact email match (email stays exact-only
// so a partial query can't be used to enumerate other users' addresses).
func (s *UserStore) SearchUsers(ctx context.Context, query string, excludeID string, limit int) ([]User, error) {
	rows, err := s.db.QueryContext(ctx, `
		select id, email, username, created_at, email_verified_at
		from users
		where id <> $1
		  and (
		    (username is not null and username ilike $2 || '%')
		    or lower(email) = lower($2)
		  )
		order by (lower(email) = lower($2)) desc, username asc
		limit $3
	`, excludeID, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []User
	for rows.Next() {
		var user User
		var username sql.NullString
		var verifiedAt sql.NullTime
		if err := rows.Scan(&user.ID, &user.Email, &username, &user.CreatedAt, &verifiedAt); err != nil {
			return nil, err
		}
		user.Username = username.String
		if verifiedAt.Valid {
			user.EmailVerifiedAt = &verifiedAt.Time
		}
		out = append(out, user)
	}
	return out, rows.Err()
}

// SetUsernameIfEmpty assigns candidate only if the user doesn't already have
// a username (used for lazy backfill on login/refresh). Returns the user's
// resulting username — either the freshly-set candidate, or whatever they
// already had if a concurrent request won the race.
func (s *UserStore) SetUsernameIfEmpty(ctx context.Context, userID, candidate string) (string, error) {
	row := s.db.QueryRowContext(ctx, `
		update users set username = $2
		where id = $1 and username is null
		returning username
	`, userID, candidate)

	var username string
	if err := row.Scan(&username); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			existing, err := s.GetByID(ctx, userID)
			if err != nil {
				return "", err
			}
			return existing.Username, nil
		}
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return "", ErrUsernameTaken
		}
		return "", err
	}
	return username, nil
}

// UpdateUsername sets a user's chosen handle, replacing any previous value.
func (s *UserStore) UpdateUsername(ctx context.Context, userID, username string) error {
	_, err := s.db.ExecContext(ctx, `
		update users set username = $2 where id = $1
	`, userID, username)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return ErrUsernameTaken
		}
		return err
	}
	return nil
}

func (s *UserStore) MarkEmailVerified(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `
		update users
		set email_verified_at = now()
		where id = $1 and email_verified_at is null
	`, id)
	return err
}

type TokenStore struct {
	db *sql.DB
}

func NewTokenStore(db *sql.DB) *TokenStore {
	return &TokenStore{db: db}
}

func (s *TokenStore) Create(ctx context.Context, userID, tokenHash string, expiresAt time.Time) error {
	_, err := s.db.ExecContext(ctx, `
		insert into refresh_tokens (user_id, token_hash, expires_at)
		values ($1, $2, $3)
	`, userID, tokenHash, expiresAt)
	return err
}

func (s *TokenStore) FindByHash(ctx context.Context, tokenHash string) (RefreshToken, error) {
	row := s.db.QueryRowContext(ctx, `
		select id, user_id, token_hash, expires_at, revoked_at, created_at
		from refresh_tokens
		where token_hash = $1
	`, tokenHash)

	var token RefreshToken
	if err := row.Scan(
		&token.ID,
		&token.UserID,
		&token.TokenHash,
		&token.ExpiresAt,
		&token.RevokedAt,
		&token.CreatedAt,
	); err != nil {
		return RefreshToken{}, err
	}
	return token, nil
}

func (s *TokenStore) Revoke(ctx context.Context, tokenID string) error {
	_, err := s.db.ExecContext(ctx, `
		update refresh_tokens
		set revoked_at = now()
		where id = $1 and revoked_at is null
	`, tokenID)
	return err
}
