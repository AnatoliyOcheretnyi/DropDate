package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/auth"
)

type authRequest struct {
	Email         string `json:"email"`
	Password      string `json:"password"`
	Client        string `json:"client,omitempty"`
	ReturnRefresh bool   `json:"returnRefresh,omitempty"`
}

type refreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

type resendVerificationRequest struct {
	Email string `json:"email"`
}

type authUserResponse struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

type authResponse struct {
	AccessToken  string           `json:"accessToken"`
	ExpiresAt    time.Time        `json:"expiresAt"`
	RefreshToken *string          `json:"refreshToken,omitempty"`
	User         authUserResponse `json:"user"`
}

func (s *Server) registerHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	if s.auth == nil {
		writeError(w, http.StatusServiceUnavailable, "auth service unavailable")
		return
	}

	var payload authRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeErrorWithDetails(w, http.StatusBadRequest, "invalid_json", "invalid JSON body", nil)
		return
	}

	result, err := s.auth.Register(r.Context(), payload.Email, payload.Password)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrEmailVerificationRequired):
			writeJSON(w, http.StatusAccepted, map[string]any{
				"status":  "verification_required",
				"message": "verify your email to continue",
			})
			return
		case errors.Is(err, auth.ErrEmailExists):
			writeErrorWithDetails(w, http.StatusConflict, "email_exists", "email already registered", nil)
		case errors.Is(err, auth.ErrWeakPassword):
			var policyErr auth.PasswordPolicyError
			if errors.As(err, &policyErr) {
				writeErrorWithDetails(
					w,
					http.StatusBadRequest,
					"weak_password",
					"password does not meet policy",
					map[string]any{
						"minLength": auth.MinPasswordLength(),
						"missing":   policyErr.Reasons,
					},
				)
				return
			}
			writeErrorWithDetails(w, http.StatusBadRequest, "weak_password", "password does not meet policy", nil)
		case errors.Is(err, auth.ErrInvalidEmail):
			writeErrorWithDetails(w, http.StatusBadRequest, "invalid_email", "invalid email", nil)
		default:
			s.logger.Printf("register failed: %v", err)
			writeErrorWithDetails(w, http.StatusInternalServerError, "internal_error", "internal server error", nil)
		}
		return
	}

	s.setRefreshCookie(w, result.RefreshToken, result.RefreshExpiresAt)
	s.writeAuthResponse(w, result, shouldReturnRefresh(payload))
}

func (s *Server) loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	if s.auth == nil {
		writeError(w, http.StatusServiceUnavailable, "auth service unavailable")
		return
	}

	var payload authRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeErrorWithDetails(w, http.StatusBadRequest, "invalid_json", "invalid JSON body", nil)
		return
	}

	result, err := s.auth.Login(r.Context(), payload.Email, payload.Password)
	if err != nil {
		if errors.Is(err, auth.ErrEmailNotVerified) {
			writeErrorWithDetails(w, http.StatusForbidden, "email_not_verified", "email not verified", nil)
			return
		}
		if errors.Is(err, auth.ErrInvalidCredentials) {
			writeErrorWithDetails(w, http.StatusUnauthorized, "invalid_credentials", "invalid credentials", nil)
			return
		}
		s.logger.Printf("login failed: %v", err)
		writeErrorWithDetails(w, http.StatusInternalServerError, "internal_error", "internal server error", nil)
		return
	}

	s.setRefreshCookie(w, result.RefreshToken, result.RefreshExpiresAt)
	s.writeAuthResponse(w, result, shouldReturnRefresh(payload))
}

func (s *Server) refreshHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	if s.auth == nil {
		writeError(w, http.StatusServiceUnavailable, "auth service unavailable")
		return
	}

	cookieName := s.auth.Config().CookieName
	refreshToken, fromBody := readRefreshToken(r, cookieName)
	if refreshToken == "" {
		writeErrorWithDetails(w, http.StatusUnauthorized, "missing_refresh_token", "missing refresh token", nil)
		return
	}

	result, err := s.auth.Refresh(r.Context(), refreshToken)
	if err != nil {
		if errors.Is(err, auth.ErrEmailNotVerified) {
			writeErrorWithDetails(w, http.StatusForbidden, "email_not_verified", "email not verified", nil)
			return
		}
		if errors.Is(err, auth.ErrInvalidToken) {
			writeErrorWithDetails(w, http.StatusUnauthorized, "invalid_refresh_token", "invalid refresh token", nil)
			return
		}
		s.logger.Printf("refresh failed: %v", err)
		writeErrorWithDetails(w, http.StatusInternalServerError, "internal_error", "internal server error", nil)
		return
	}

	s.setRefreshCookie(w, result.RefreshToken, result.RefreshExpiresAt)
	s.writeAuthResponse(w, result, fromBody)
}

func (s *Server) logoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	if s.auth == nil {
		writeError(w, http.StatusServiceUnavailable, "auth service unavailable")
		return
	}

	cookieName := s.auth.Config().CookieName
	refreshToken, _ := readRefreshToken(r, cookieName)
	if refreshToken != "" {
		if err := s.auth.Logout(r.Context(), refreshToken); err != nil {
			s.logger.Printf("logout failed: %v", err)
		}
	}

	s.clearRefreshCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) verifyEmailHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	if s.auth == nil {
		writeError(w, http.StatusServiceUnavailable, "auth service unavailable")
		return
	}

	token := strings.TrimSpace(r.URL.Query().Get("token"))
	if token == "" {
		writeErrorWithDetails(w, http.StatusBadRequest, "missing_token", "token is required", nil)
		return
	}

	if err := s.auth.VerifyEmail(r.Context(), token); err != nil {
		switch {
		case errors.Is(err, auth.ErrVerificationTokenNotFound):
			writeErrorWithDetails(w, http.StatusBadRequest, "token_not_found", "invalid verification token", nil)
			return
		case errors.Is(err, auth.ErrVerificationTokenExpired):
			writeErrorWithDetails(w, http.StatusBadRequest, "token_expired", "verification token expired", nil)
			return
		case errors.Is(err, auth.ErrVerificationTokenUsed):
			writeErrorWithDetails(w, http.StatusBadRequest, "token_used", "verification token already used", nil)
			return
		case errors.Is(err, auth.ErrInvalidVerificationToken):
			writeErrorWithDetails(w, http.StatusBadRequest, "invalid_token", "invalid or expired token", nil)
			return
		}
		s.logger.Printf("verify email failed: %v", err)
		writeErrorWithDetails(w, http.StatusInternalServerError, "internal_error", "internal server error", nil)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "verified"})
}

func (s *Server) resendVerificationHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	if s.auth == nil {
		writeError(w, http.StatusServiceUnavailable, "auth service unavailable")
		return
	}

	var payload resendVerificationRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeErrorWithDetails(w, http.StatusBadRequest, "invalid_json", "invalid JSON body", nil)
		return
	}

	email := strings.TrimSpace(payload.Email)
	if email == "" {
		writeErrorWithDetails(w, http.StatusBadRequest, "invalid_email", "invalid email", nil)
		return
	}

	if err := s.auth.ResendVerification(r.Context(), email); err != nil {
		switch {
		case errors.Is(err, auth.ErrInvalidEmail):
			writeErrorWithDetails(w, http.StatusBadRequest, "invalid_email", "invalid email", nil)
			return
		case errors.Is(err, auth.ErrEmailAlreadyVerified):
			writeJSON(w, http.StatusOK, map[string]string{"status": "already_verified"})
			return
		case errors.Is(err, auth.ErrVerificationResendTooSoon):
			var cooldown auth.VerificationResendCooldownError
			retryAfter := 0
			if errors.As(err, &cooldown) {
				retryAfter = int(cooldown.RetryAfter.Seconds())
				if retryAfter < 1 {
					retryAfter = 1
				}
			}
			writeErrorWithDetails(w, http.StatusTooManyRequests, "resend_too_soon", "verification already sent", map[string]any{
				"retryAfterSeconds": retryAfter,
			})
			return
		}
		s.logger.Printf("resend verification failed: %v", err)
		writeErrorWithDetails(w, http.StatusInternalServerError, "internal_error", "internal server error", nil)
		return
	}

	writeJSON(w, http.StatusAccepted, map[string]string{"status": "sent"})
}

func (s *Server) setRefreshCookie(w http.ResponseWriter, token string, expiresAt time.Time) {
	cfg := s.auth.Config()
	http.SetCookie(w, &http.Cookie{
		Name:     cfg.CookieName,
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		Secure:   cfg.CookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
}

func (s *Server) clearRefreshCookie(w http.ResponseWriter) {
	cfg := s.auth.Config()
	http.SetCookie(w, &http.Cookie{
		Name:     cfg.CookieName,
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   cfg.CookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
}

func (s *Server) writeAuthResponse(w http.ResponseWriter, result auth.TokenPair, includeRefresh bool) {
	var refresh *string
	if includeRefresh {
		refresh = &result.RefreshToken
	}
	writeJSON(w, http.StatusOK, authResponse{
		AccessToken:  result.AccessToken,
		ExpiresAt:    result.AccessExpiresAt,
		RefreshToken: refresh,
		User: authUserResponse{
			ID:    result.User.ID,
			Email: result.User.Email,
		},
	})
}

func shouldReturnRefresh(payload authRequest) bool {
	if payload.ReturnRefresh {
		return true
	}
	return strings.EqualFold(payload.Client, "mobile")
}

func readRefreshToken(r *http.Request, cookieName string) (string, bool) {
	if cookie, err := r.Cookie(cookieName); err == nil && cookie.Value != "" {
		return cookie.Value, false
	}

	var payload refreshRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		if errors.Is(err, io.EOF) {
			return "", false
		}
		return "", false
	}
	token := strings.TrimSpace(payload.RefreshToken)
	if token == "" {
		return "", false
	}
	return token, true
}
