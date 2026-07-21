package httpapi

import (
	"errors"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func securityTestServer(options ServerOptions) *Server {
	return NewServer(nil, nil, nil, nil, nil, nil, nil, nil, log.New(io.Discard, "", 0), options)
}

func TestJobEndpointsFailClosedWithoutToken(t *testing.T) {
	server := securityTestServer(ServerOptions{})
	for _, path := range []string{"/jobs/notifications", "/jobs/akinator"} {
		req := httptest.NewRequest(http.MethodPost, path, nil)
		rec := httptest.NewRecorder()
		server.Routes().ServeHTTP(rec, req)
		if rec.Code != http.StatusServiceUnavailable {
			t.Fatalf("%s: expected 503, got %d", path, rec.Code)
		}
	}
}

func TestJobEndpointsRejectWrongToken(t *testing.T) {
	server := securityTestServer(ServerOptions{JobsAccessToken: "correct-secret"})
	for _, path := range []string{"/jobs/notifications", "/jobs/akinator"} {
		req := httptest.NewRequest(http.MethodPost, path, nil)
		req.Header.Set("Authorization", "Bearer wrong-secret")
		rec := httptest.NewRecorder()
		server.Routes().ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("%s: expected 401, got %d", path, rec.Code)
		}
	}
}

func TestMiddlewareLimitsRequestBody(t *testing.T) {
	server := securityTestServer(ServerOptions{MaxBodyBytes: 8})
	handler := server.withMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, err := io.ReadAll(r.Body)
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			writeError(w, http.StatusRequestEntityTooLarge, "request body too large")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodPost, "/auth/login", strings.NewReader("0123456789"))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected 413, got %d", rec.Code)
	}
}

func TestMiddlewareRateLimitsAuthSeparately(t *testing.T) {
	server := securityTestServer(ServerOptions{RateLimits: RateLimitConfig{
		GeneralPerMinute:   10,
		AuthPerMinute:      2,
		ExpensivePerMinute: 10,
	}})
	handler := server.withMiddleware(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	for i := 0; i < 3; i++ {
		req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
		req.RemoteAddr = "192.0.2.1:4321"
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if i < 2 && rec.Code != http.StatusNoContent {
			t.Fatalf("request %d: expected 204, got %d", i+1, rec.Code)
		}
		if i == 2 && rec.Code != http.StatusTooManyRequests {
			t.Fatalf("request %d: expected 429, got %d", i+1, rec.Code)
		}
	}
}
