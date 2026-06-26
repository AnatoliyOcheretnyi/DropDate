package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"testing"
)

type stubReadiness struct {
	checks map[string]error
}

func (s stubReadiness) Readiness(_ context.Context) map[string]error {
	return s.checks
}

func TestHealthHandler(t *testing.T) {
	server := NewServer(nil, nil, nil, nil, nil, log.New(io.Discard, "", 0), ServerOptions{})

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	server.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var payload map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload["status"] != "ok" {
		t.Fatalf("expected status ok, got %q", payload["status"])
	}
}

func TestReadyHandlerWithFailures(t *testing.T) {
	server := NewServer(
		nil,
		nil,
		nil,
		nil,
		nil,
		log.New(io.Discard, "", 0),
		ServerOptions{
			Readiness: stubReadiness{
				checks: map[string]error{
					"database": errors.New("down"),
					"tmdb":     nil,
				},
			},
		},
	)

	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	rec := httptest.NewRecorder()

	server.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", rec.Code)
	}

	var payload map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload["status"] != "not_ready" {
		t.Fatalf("expected not_ready, got %v", payload["status"])
	}
	checks, ok := payload["checks"].(map[string]any)
	if !ok {
		t.Fatalf("expected checks object")
	}
	if checks["database"] != "down" {
		t.Fatalf("expected database error, got %v", checks["database"])
	}
	if checks["tmdb"] != "ok" {
		t.Fatalf("expected tmdb ok, got %v", checks["tmdb"])
	}
}
