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
		returning id, email, created_at, email_verified_at
	`, email, passwordHash)

	var user User
	var verifiedAt sql.NullTime
	if err := row.Scan(&user.ID, &user.Email, &user.CreatedAt, &verifiedAt); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return User{}, ErrEmailExists
		}
		return User{}, err
	}
	if verifiedAt.Valid {
		user.EmailVerifiedAt = &verifiedAt.Time
	}
	return user, nil
}

func (s *UserStore) GetByEmail(ctx context.Context, email string) (User, string, error) {
	row := s.db.QueryRowContext(ctx, `
		select id, email, password_hash, created_at, email_verified_at
		from users
		where email = $1
	`, email)

	var user User
	var hash string
	var verifiedAt sql.NullTime
	if err := row.Scan(&user.ID, &user.Email, &hash, &user.CreatedAt, &verifiedAt); err != nil {
		return User{}, "", err
	}
	if verifiedAt.Valid {
		user.EmailVerifiedAt = &verifiedAt.Time
	}
	return user, hash, nil
}

func (s *UserStore) GetByID(ctx context.Context, id string) (User, error) {
	row := s.db.QueryRowContext(ctx, `
		select id, email, created_at, email_verified_at
		from users
		where id = $1
	`, id)

	var user User
	var verifiedAt sql.NullTime
	if err := row.Scan(&user.ID, &user.Email, &user.CreatedAt, &verifiedAt); err != nil {
		return User{}, err
	}
	if verifiedAt.Valid {
		user.EmailVerifiedAt = &verifiedAt.Time
	}
	return user, nil
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
