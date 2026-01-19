package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/email"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrEmailExists               = errors.New("email already registered")
	ErrInvalidCredentials        = errors.New("invalid credentials")
	ErrInvalidToken              = errors.New("invalid refresh token")
	ErrWeakPassword              = errors.New("password does not meet policy")
	ErrInvalidEmail              = errors.New("invalid email")
	ErrEmailNotVerified          = errors.New("email not verified")
	ErrEmailVerificationRequired = errors.New("email verification required")
	ErrInvalidVerificationToken  = errors.New("invalid verification token")
)

const minPasswordLength = 8

func MinPasswordLength() int {
	return minPasswordLength
}

type PasswordPolicyError struct {
	Reasons []string
}

func (e PasswordPolicyError) Error() string {
	return ErrWeakPassword.Error()
}

func (e PasswordPolicyError) Unwrap() error {
	return ErrWeakPassword
}

type Config struct {
	JWTSecret                []byte
	Issuer                   string
	AccessTTL                time.Duration
	RefreshTTL               time.Duration
	CookieName               string
	CookieSecure             bool
	RequireEmailVerification bool
	EmailVerificationTTL     time.Duration
	AppBaseURL               string
	EmailSender              email.Sender
	EmailFrom                string
}

type Service struct {
	users         *UserStore
	tokens        *TokenStore
	verifications *EmailVerificationStore
	cfg           Config
}

type User struct {
	ID              string
	Email           string
	CreatedAt       time.Time
	EmailVerifiedAt *time.Time
}

type RefreshToken struct {
	ID        string
	UserID    string
	TokenHash string
	ExpiresAt time.Time
	RevokedAt sql.NullTime
	CreatedAt time.Time
}

type TokenPair struct {
	AccessToken      string
	RefreshToken     string
	User             User
	AccessExpiresAt  time.Time
	RefreshExpiresAt time.Time
}

func NewService(db *sql.DB, cfg Config) *Service {
	return &Service{
		users:         NewUserStore(db),
		tokens:        NewTokenStore(db),
		verifications: NewEmailVerificationStore(db),
		cfg:           cfg,
	}
}

func (s *Service) Config() Config {
	return s.cfg
}

func (s *Service) Register(ctx context.Context, email, password string) (TokenPair, error) {
	email = normalizeEmail(email)
	if err := validateEmail(email); err != nil {
		return TokenPair{}, err
	}
	if err := validatePassword(password); err != nil {
		return TokenPair{}, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return TokenPair{}, err
	}

	user, err := s.users.Create(ctx, email, string(hash))
	if err != nil {
		return TokenPair{}, err
	}

	if s.cfg.RequireEmailVerification {
		if err := s.sendVerificationEmail(ctx, user); err != nil {
			return TokenPair{}, err
		}
		return TokenPair{}, ErrEmailVerificationRequired
	}

	return s.issueTokens(ctx, user)
}

func (s *Service) Login(ctx context.Context, email, password string) (TokenPair, error) {
	email = normalizeEmail(email)
	user, hash, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return TokenPair{}, ErrInvalidCredentials
		}
		return TokenPair{}, err
	}

	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return TokenPair{}, ErrInvalidCredentials
	}
	if s.cfg.RequireEmailVerification && user.EmailVerifiedAt == nil {
		return TokenPair{}, ErrEmailNotVerified
	}

	return s.issueTokens(ctx, user)
}

func (s *Service) Refresh(ctx context.Context, refreshToken string) (TokenPair, error) {
	if refreshToken == "" {
		return TokenPair{}, ErrInvalidToken
	}

	tokenHash := hashToken(refreshToken)
	stored, err := s.tokens.FindByHash(ctx, tokenHash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return TokenPair{}, ErrInvalidToken
		}
		return TokenPair{}, err
	}

	if stored.RevokedAt.Valid || time.Now().After(stored.ExpiresAt) {
		return TokenPair{}, ErrInvalidToken
	}

	if err := s.tokens.Revoke(ctx, stored.ID); err != nil {
		return TokenPair{}, err
	}

	user, err := s.users.GetByID(ctx, stored.UserID)
	if err != nil {
		return TokenPair{}, err
	}
	if s.cfg.RequireEmailVerification && user.EmailVerifiedAt == nil {
		return TokenPair{}, ErrEmailNotVerified
	}

	return s.issueTokens(ctx, user)
}

func (s *Service) Logout(ctx context.Context, refreshToken string) error {
	if refreshToken == "" {
		return nil
	}
	tokenHash := hashToken(refreshToken)
	stored, err := s.tokens.FindByHash(ctx, tokenHash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil
		}
		return err
	}
	return s.tokens.Revoke(ctx, stored.ID)
}

func (s *Service) VerifyEmail(ctx context.Context, token string) error {
	if token == "" {
		return ErrInvalidVerificationToken
	}
	tokenHash := hashToken(token)
	record, err := s.verifications.FindByHash(ctx, tokenHash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrInvalidVerificationToken
		}
		return err
	}
	if record.UsedAt.Valid || time.Now().After(record.ExpiresAt) {
		return ErrInvalidVerificationToken
	}

	if err := s.users.MarkEmailVerified(ctx, record.UserID); err != nil {
		return err
	}
	return s.verifications.MarkUsed(ctx, record.ID)
}

func (s *Service) issueTokens(ctx context.Context, user User) (TokenPair, error) {
	accessToken, expiresAt, err := s.createAccessToken(user)
	if err != nil {
		return TokenPair{}, err
	}

	refreshToken, err := generateToken()
	if err != nil {
		return TokenPair{}, err
	}

	refreshExpires := time.Now().Add(s.cfg.RefreshTTL)
	if err := s.tokens.Create(ctx, user.ID, hashToken(refreshToken), refreshExpires); err != nil {
		return TokenPair{}, err
	}

	return TokenPair{
		AccessToken:      accessToken,
		RefreshToken:     refreshToken,
		User:             user,
		AccessExpiresAt:  expiresAt,
		RefreshExpiresAt: refreshExpires,
	}, nil
}

func (s *Service) sendVerificationEmail(ctx context.Context, user User) error {
	if s.cfg.EmailSender == nil || s.cfg.EmailFrom == "" || s.cfg.AppBaseURL == "" {
		return fmt.Errorf("email verification is enabled but email sender is not configured")
	}
	if s.cfg.EmailVerificationTTL <= 0 {
		return fmt.Errorf("email verification ttl must be > 0")
	}

	token, err := generateToken()
	if err != nil {
		return err
	}
	expiresAt := time.Now().Add(s.cfg.EmailVerificationTTL)
	if err := s.verifications.Create(ctx, user.ID, hashToken(token), expiresAt); err != nil {
		return err
	}

	link := strings.TrimRight(s.cfg.AppBaseURL, "/") + "/auth/verify?token=" + token
	subject := "Confirm your DropDate email"
	body := "Please confirm your email by clicking the link below:<br><br>" +
		"<a href=\"" + link + "\">Verify email</a><br><br>" +
		"If you didn't request this, you can ignore this email."

	return s.cfg.EmailSender.Send(ctx, email.Message{
		From:    s.cfg.EmailFrom,
		To:      user.Email,
		Subject: subject,
		HTML:    body,
	})
}

func (s *Service) createAccessToken(user User) (string, time.Time, error) {
	expiresAt := time.Now().Add(s.cfg.AccessTTL)
	claims := jwt.RegisteredClaims{
		Subject:   user.ID,
		Issuer:    s.cfg.Issuer,
		ExpiresAt: jwt.NewNumericDate(expiresAt),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.cfg.JWTSecret)
	if err != nil {
		return "", time.Time{}, err
	}
	return signed, expiresAt, nil
}

func (s *Service) ParseAccessToken(tokenStr string) (string, error) {
	if tokenStr == "" {
		return "", ErrInvalidToken
	}

	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(s.cfg.Issuer),
	)
	claims := jwt.RegisteredClaims{}
	_, err := parser.ParseWithClaims(tokenStr, &claims, func(token *jwt.Token) (interface{}, error) {
		return s.cfg.JWTSecret, nil
	})
	if err != nil {
		return "", ErrInvalidToken
	}
	if claims.Subject == "" {
		return "", ErrInvalidToken
	}
	return claims.Subject, nil
}

func generateToken() (string, error) {
	buffer := make([]byte, 32)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buffer), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func normalizeEmail(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func validateEmail(value string) error {
	if value == "" {
		return ErrInvalidEmail
	}
	if _, err := mail.ParseAddress(value); err != nil {
		return ErrInvalidEmail
	}
	return nil
}

func validatePassword(value string) error {
	var reasons []string
	if len(value) < minPasswordLength {
		reasons = append(reasons, "min_length")
	}
	var hasUpper, hasLower, hasDigit, hasSpecial bool
	for _, r := range value {
		switch {
		case r >= 'A' && r <= 'Z':
			hasUpper = true
		case r >= 'a' && r <= 'z':
			hasLower = true
		case r >= '0' && r <= '9':
			hasDigit = true
		default:
			hasSpecial = true
		}
	}
	if !hasUpper || !hasLower || !hasDigit || !hasSpecial {
		if !hasUpper {
			reasons = append(reasons, "upper")
		}
		if !hasLower {
			reasons = append(reasons, "lower")
		}
		if !hasDigit {
			reasons = append(reasons, "digit")
		}
		if !hasSpecial {
			reasons = append(reasons, "special")
		}
	}
	if len(reasons) > 0 {
		return PasswordPolicyError{Reasons: reasons}
	}
	return nil
}
