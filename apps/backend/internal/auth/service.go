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
	ErrEmailAlreadyVerified      = errors.New("email already verified")
	ErrInvalidVerificationToken  = errors.New("invalid verification token")
	ErrVerificationTokenNotFound = errors.New("verification token not found")
	ErrVerificationTokenExpired  = errors.New("verification token expired")
	ErrVerificationTokenUsed     = errors.New("verification token already used")
	ErrVerificationResendTooSoon = errors.New("verification resend too soon")
	ErrUserNotFound              = errors.New("user not found")
	ErrUsernameTaken             = errors.New("username already taken")
	ErrInvalidUsername           = errors.New("invalid username")
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

type VerificationResendCooldownError struct {
	RetryAfter time.Duration
}

func (e VerificationResendCooldownError) Error() string {
	return ErrVerificationResendTooSoon.Error()
}

func (e VerificationResendCooldownError) Unwrap() error {
	return ErrVerificationResendTooSoon
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
	VerificationResendCooldown time.Duration
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
	Username        string
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
			return ErrVerificationTokenNotFound
		}
		return err
	}
	if record.UsedAt.Valid {
		return ErrVerificationTokenUsed
	}
	if time.Now().After(record.ExpiresAt) {
		return ErrVerificationTokenExpired
	}

	if err := s.users.MarkEmailVerified(ctx, record.UserID); err != nil {
		return err
	}
	return s.verifications.MarkUsed(ctx, record.ID)
}

func (s *Service) ResendVerification(ctx context.Context, email string) error {
	email = normalizeEmail(email)
	if err := validateEmail(email); err != nil {
		return err
	}
	if !s.cfg.RequireEmailVerification {
		return nil
	}

	user, _, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil
		}
		return err
	}
	if user.EmailVerifiedAt != nil {
		return ErrEmailAlreadyVerified
	}

	if s.cfg.VerificationResendCooldown > 0 {
		last, err := s.verifications.LatestByUser(ctx, user.ID)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		if err == nil {
			elapsed := time.Since(last.CreatedAt)
			if elapsed < s.cfg.VerificationResendCooldown {
				return VerificationResendCooldownError{
					RetryAfter: s.cfg.VerificationResendCooldown - elapsed,
				}
			}
		}
	}

	return s.sendVerificationEmail(ctx, user)
}

func (s *Service) issueTokens(ctx context.Context, user User) (TokenPair, error) {
	user, err := s.ensureUsername(ctx, user)
	if err != nil {
		return TokenPair{}, err
	}

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

// GetByID returns a user by id, e.g. for the "who am I" profile endpoint.
func (s *Service) GetByID(ctx context.Context, id string) (User, error) {
	return s.users.GetByID(ctx, id)
}

// FindByUsernameOrEmail resolves a user for the friend-search flow — the
// caller supplies either an exact @username or an exact email address.
func (s *Service) FindByUsernameOrEmail(ctx context.Context, query string) (User, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return User{}, ErrUserNotFound
	}
	user, err := s.users.FindByUsernameOrEmail(ctx, query)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return User{}, ErrUserNotFound
		}
		return User{}, err
	}
	return user, nil
}

// SearchUsers powers the friend-search typeahead: username prefix match
// (case-insensitive) plus an exact email match, excluding the caller.
func (s *Service) SearchUsers(ctx context.Context, callerID, query string, limit int) ([]User, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return nil, nil
	}
	if limit <= 0 || limit > 20 {
		limit = 8
	}
	return s.users.SearchUsers(ctx, escapeLikePattern(query), callerID, limit)
}

// UpdateUsername lets a user pick their own public handle, replacing the
// auto-generated one issued at login.
func (s *Service) UpdateUsername(ctx context.Context, userID, username string) (User, error) {
	normalized, err := normalizeUsername(username)
	if err != nil {
		return User{}, err
	}
	if err := s.users.UpdateUsername(ctx, userID, normalized); err != nil {
		return User{}, err
	}
	return s.users.GetByID(ctx, userID)
}

// ensureUsername lazily backfills a username for accounts created before
// this field existed (or for any user who hasn't set one yet) so friend
// search always has something to match against, with no separate data
// migration script — mirrors the achievements ladder's self-healing backfill.
func (s *Service) ensureUsername(ctx context.Context, user User) (User, error) {
	if user.Username != "" {
		return user, nil
	}
	for attempt := 0; attempt < 6; attempt++ {
		candidate := generateUsername(user.Email, attempt)
		username, err := s.users.SetUsernameIfEmpty(ctx, user.ID, candidate)
		if err == nil {
			user.Username = username
			return user, nil
		}
		if errors.Is(err, ErrUsernameTaken) {
			continue
		}
		return user, err
	}
	return user, fmt.Errorf("could not allocate a unique username")
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

// escapeLikePattern neutralizes SQL LIKE/ILIKE wildcards in user-supplied
// search input so "%" or "_" behave as literal characters, not wildcards.
func escapeLikePattern(value string) string {
	replacer := strings.NewReplacer(`\`, `\\`, "%", `\%`, "_", `\_`)
	return replacer.Replace(value)
}

const (
	minUsernameLength = 3
	maxUsernameLength = 24
)

func normalizeUsername(value string) (string, error) {
	value = strings.ToLower(strings.TrimSpace(value))
	if len(value) < minUsernameLength || len(value) > maxUsernameLength {
		return "", ErrInvalidUsername
	}
	for _, r := range value {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9', r == '_', r == '.':
			continue
		default:
			return "", ErrInvalidUsername
		}
	}
	return value, nil
}

// generateUsername derives a candidate handle from the email's local part.
// attempt 0 tries the bare local part; later attempts append a random suffix
// so a collision (checked by the caller) can retry with a fresh candidate.
func generateUsername(emailAddr string, attempt int) string {
	local := emailAddr
	if idx := strings.IndexByte(emailAddr, '@'); idx >= 0 {
		local = emailAddr[:idx]
	}
	local = strings.ToLower(local)

	var b strings.Builder
	for _, r := range local {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9', r == '_', r == '.':
			b.WriteRune(r)
		}
	}
	base := b.String()
	if len(base) < minUsernameLength {
		base = "user" + base
	}
	if len(base) > 18 {
		base = base[:18]
	}
	if attempt == 0 {
		return base
	}
	return base + randomDigits(4)
}

func randomDigits(n int) string {
	digits := make([]byte, n)
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		// Extremely unlikely; fall back to a fixed suffix rather than fail
		// username generation outright.
		for i := range digits {
			digits[i] = '0'
		}
		return string(digits)
	}
	for i, v := range buf {
		digits[i] = '0' + v%10
	}
	return string(digits)
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
