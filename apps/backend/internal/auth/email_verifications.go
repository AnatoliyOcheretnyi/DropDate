package auth

import (
	"context"
	"database/sql"
	"time"
)

type EmailVerification struct {
	ID        string
	UserID    string
	TokenHash string
	ExpiresAt time.Time
	UsedAt    sql.NullTime
	CreatedAt time.Time
}

type EmailVerificationStore struct {
	db *sql.DB
}

func NewEmailVerificationStore(db *sql.DB) *EmailVerificationStore {
	return &EmailVerificationStore{db: db}
}

func (s *EmailVerificationStore) Create(ctx context.Context, userID, tokenHash string, expiresAt time.Time) error {
	_, err := s.db.ExecContext(ctx, `
		insert into email_verifications (user_id, token_hash, expires_at)
		values ($1, $2, $3)
	`, userID, tokenHash, expiresAt)
	return err
}

func (s *EmailVerificationStore) FindByHash(ctx context.Context, tokenHash string) (EmailVerification, error) {
	row := s.db.QueryRowContext(ctx, `
		select id, user_id, token_hash, expires_at, used_at, created_at
		from email_verifications
		where token_hash = $1
	`, tokenHash)

	var record EmailVerification
	if err := row.Scan(
		&record.ID,
		&record.UserID,
		&record.TokenHash,
		&record.ExpiresAt,
		&record.UsedAt,
		&record.CreatedAt,
	); err != nil {
		return EmailVerification{}, err
	}
	return record, nil
}

func (s *EmailVerificationStore) MarkUsed(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `
		update email_verifications
		set used_at = now()
		where id = $1 and used_at is null
	`, id)
	return err
}
