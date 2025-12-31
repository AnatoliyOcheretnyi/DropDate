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
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.auth == nil {
		http.Error(w, "auth service unavailable", http.StatusServiceUnavailable)
		return
	}

	var payload authRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	result, err := s.auth.Register(r.Context(), payload.Email, payload.Password)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrEmailExists):
			http.Error(w, "email already registered", http.StatusConflict)
		case errors.Is(err, auth.ErrWeakPassword):
			http.Error(w, "password does not meet policy", http.StatusBadRequest)
		case errors.Is(err, auth.ErrInvalidEmail):
			http.Error(w, "invalid email", http.StatusBadRequest)
		default:
			s.logger.Printf("register failed: %v", err)
			http.Error(w, "internal server error", http.StatusInternalServerError)
		}
		return
	}

	s.setRefreshCookie(w, result.RefreshToken, result.RefreshExpiresAt)
	s.writeAuthResponse(w, result, shouldReturnRefresh(payload))
}

func (s *Server) loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.auth == nil {
		http.Error(w, "auth service unavailable", http.StatusServiceUnavailable)
		return
	}

	var payload authRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	result, err := s.auth.Login(r.Context(), payload.Email, payload.Password)
	if err != nil {
		if errors.Is(err, auth.ErrInvalidCredentials) {
			http.Error(w, "invalid credentials", http.StatusUnauthorized)
			return
		}
		s.logger.Printf("login failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	s.setRefreshCookie(w, result.RefreshToken, result.RefreshExpiresAt)
	s.writeAuthResponse(w, result, shouldReturnRefresh(payload))
}

func (s *Server) refreshHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.auth == nil {
		http.Error(w, "auth service unavailable", http.StatusServiceUnavailable)
		return
	}

	cookieName := s.auth.Config().CookieName
	refreshToken, fromBody := readRefreshToken(r, cookieName)
	if refreshToken == "" {
		http.Error(w, "missing refresh token", http.StatusUnauthorized)
		return
	}

	result, err := s.auth.Refresh(r.Context(), refreshToken)
	if err != nil {
		if errors.Is(err, auth.ErrInvalidToken) {
			http.Error(w, "invalid refresh token", http.StatusUnauthorized)
			return
		}
		s.logger.Printf("refresh failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	s.setRefreshCookie(w, result.RefreshToken, result.RefreshExpiresAt)
	s.writeAuthResponse(w, result, fromBody)
}

func (s *Server) logoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.auth == nil {
		http.Error(w, "auth service unavailable", http.StatusServiceUnavailable)
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
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(authResponse{
		AccessToken:  result.AccessToken,
		ExpiresAt:    result.AccessExpiresAt,
		RefreshToken: refresh,
		User: authUserResponse{
			ID:    result.User.ID,
			Email: result.User.Email,
		},
	}); err != nil {
		s.logger.Printf("failed to encode auth response: %v", err)
	}
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
