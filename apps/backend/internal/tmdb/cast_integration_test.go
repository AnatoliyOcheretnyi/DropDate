//go:build integration

package tmdb

import (
	"context"
	"net/http"
	"os"
	"testing"
	"time"
)

func TestDetailsCastIntegration(t *testing.T) {
	token := os.Getenv("TMDB_ACCESS_TOKEN")
	if token == "" {
		t.Skip("TMDB_ACCESS_TOKEN not set; skipping live TMDB test")
	}
	client, err := NewClient(&http.Client{Timeout: 10 * time.Second}, token)
	if err != nil {
		t.Fatalf("new client: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	info, err := client.DetailsByID(ctx, 27205, "movie") // Inception
	if err != nil {
		t.Fatalf("details: %v", err)
	}
	if len(info.Cast) == 0 {
		t.Fatal("expected non-empty cast")
	}
	for i, m := range info.Cast {
		if m.Name == "" {
			t.Errorf("cast %d has empty name", i)
		}
		t.Logf("#%d %s — %s (%s)", i+1, m.Name, m.Character, m.ProfileURL)
	}
}
