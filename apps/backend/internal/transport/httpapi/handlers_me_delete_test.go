package httpapi

import (
	"context"
	"errors"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/auth"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type deletionAuth struct {
	AuthService
	deleted  bool
	password string
	err      error
}

func (a *deletionAuth) ParseAccessToken(token string) (string, error) {
	if token != "valid" {
		return "", auth.ErrInvalidToken
	}
	return "current-user", nil
}
func (a *deletionAuth) GetByID(context.Context, string) (auth.User, error) {
	if a.deleted {
		return auth.User{}, errors.New("user not found")
	}
	return auth.User{ID: "current-user"}, nil
}
func (a *deletionAuth) DeleteAccount(_ context.Context, id, password string) error {
	if id != "current-user" {
		panic("deletion must be scoped to authenticated user")
	}
	a.password = password
	if a.err != nil {
		return a.err
	}
	a.deleted = true
	return nil
}
func TestDeleteAccount(t *testing.T) {
	for _, tc := range []struct {
		name, token, body string
		err               error
		status            int
	}{
		{"unauthorized", "", `{"password":"secret","confirmation":"DELETE"}`, nil, 401},
		{"missing confirmation", "valid", `{"password":"secret"}`, nil, 400},
		{"no password", "valid", `{"confirmation":"DELETE"}`, nil, 400},
		{"cannot target another user", "valid", `{"password":"secret","confirmation":"DELETE","userId":"other"}`, nil, 400},
		{"wrong password", "valid", `{"password":"secret","confirmation":"DELETE"}`, auth.ErrInvalidCredentials, 403},
		{"database failure", "valid", `{"password":"secret","confirmation":"DELETE"}`, errors.New("db failed"), 500},
		{"success", "valid", `{"password":"secret","confirmation":"DELETE"}`, nil, 204},
	} {
		t.Run(tc.name, func(t *testing.T) {
			a := &deletionAuth{err: tc.err}
			s := &Server{auth: a, logger: log.New(io.Discard, "", 0)}
			r := httptest.NewRequest(http.MethodDelete, "/me", strings.NewReader(tc.body))
			if tc.token != "" {
				r.Header.Set("Authorization", "Bearer "+tc.token)
			}
			w := httptest.NewRecorder()
			s.meHandler(w, r)
			if w.Code != tc.status {
				t.Fatalf("status %d, want %d: %s", w.Code, tc.status, w.Body.String())
			}
			if a.deleted != (tc.status == 204) {
				t.Fatal("unexpected deletion")
			}
			if a.deleted {
				if _, err := s.requireUserID(r); err == nil {
					t.Fatal("deleted account JWT still authorized")
				}
			}
		})
	}
}
