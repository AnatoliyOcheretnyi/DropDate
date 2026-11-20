package auth

import (
	"context"
	"database/sql"
	"errors"
	"golang.org/x/crypto/bcrypt"
)

// DeleteAccount reauthenticates and deletes within one transaction. Every
// user-owned table references users with ON DELETE CASCADE, including refresh
// tokens, verification tokens, shared lists, memberships and recommendations.
func (s *Service) DeleteAccount(ctx context.Context, userID, password string) error {
	if password == "" || len(password) > 72 {
		return ErrInvalidCredentials
	}
	tx, err := s.users.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var hash string
	if err := tx.QueryRowContext(ctx, `select password_hash from users where id = $1 for update`, userID).Scan(&hash); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrInvalidCredentials
		}
		return err
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return ErrInvalidCredentials
	}
	if _, err := tx.ExecContext(ctx, `delete from users where id = $1`, userID); err != nil {
		return err
	}
	return tx.Commit()
}
