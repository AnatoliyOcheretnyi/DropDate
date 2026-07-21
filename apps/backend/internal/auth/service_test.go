package auth

import (
	"errors"
	"testing"
	"time"
)

func TestValidatePasswordPolicy(t *testing.T) {
	if err := validatePassword("StrongP@ss1"); err != nil {
		t.Fatalf("expected strong password, got %v", err)
	}

	err := validatePassword("weak")
	var policy PasswordPolicyError
	if !errors.As(err, &policy) {
		t.Fatalf("expected password policy error, got %v", err)
	}
	if len(policy.Reasons) == 0 {
		t.Fatal("expected missing policy reasons")
	}
}

func TestAccessTokenRoundTrip(t *testing.T) {
	service := &Service{cfg: Config{
		JWTSecret: []byte("a-long-test-secret-that-is-not-used-in-production"),
		Issuer:    "dropdate-test",
		AccessTTL: time.Minute,
	}}
	token, _, err := service.createAccessToken(User{ID: "user-123"})
	if err != nil {
		t.Fatalf("create token: %v", err)
	}

	userID, err := service.ParseAccessToken(token)
	if err != nil {
		t.Fatalf("parse token: %v", err)
	}
	if userID != "user-123" {
		t.Fatalf("expected user-123, got %q", userID)
	}
}

func TestAccessTokenRejectsWrongIssuer(t *testing.T) {
	issuer := &Service{cfg: Config{JWTSecret: []byte("shared-test-secret"), Issuer: "issuer-a", AccessTTL: time.Minute}}
	parser := &Service{cfg: Config{JWTSecret: []byte("shared-test-secret"), Issuer: "issuer-b", AccessTTL: time.Minute}}
	token, _, err := issuer.createAccessToken(User{ID: "user-123"})
	if err != nil {
		t.Fatalf("create token: %v", err)
	}
	if _, err := parser.ParseAccessToken(token); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("expected invalid token, got %v", err)
	}
}

func TestNormalizeUsername(t *testing.T) {
	value, err := normalizeUsername("  Movie.Fan_7 ")
	if err != nil || value != "movie.fan_7" {
		t.Fatalf("unexpected normalized username %q, err=%v", value, err)
	}
	if _, err := normalizeUsername("bad name"); !errors.Is(err, ErrInvalidUsername) {
		t.Fatalf("expected invalid username, got %v", err)
	}
}
