package airecs

import (
	"context"
	"os"
	"testing"
	"time"
)

// TestRerankIntegration exercises the real Gemini API. It is skipped unless
// GEMINI_API_KEY is set, so it never runs in normal CI.
func TestRerankIntegration(t *testing.T) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		t.Skip("GEMINI_API_KEY not set; skipping live Gemini test")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	svc, err := NewService(ctx, apiKey, os.Getenv("GEMINI_MODEL"), nil)
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	profile := []TasteSignal{
		{Title: "Inception", MediaType: "movie", Sentiment: "favorite"},
		{Title: "Interstellar", MediaType: "movie", Sentiment: "loved", Rating: 9},
		{Title: "Breaking Bad", MediaType: "tv", Sentiment: "loved", Rating: 10},
		{Title: "Emily in Paris", MediaType: "tv", Sentiment: "disliked", Rating: 3},
	}
	pool := []Candidate{
		{TMDBID: 27205, MediaType: "movie", Title: "Inception", Year: "2010"},
		{TMDBID: 157336, MediaType: "movie", Title: "Interstellar", Year: "2014"},
		{TMDBID: 1396, MediaType: "tv", Title: "Breaking Bad", Year: "2008"},
		{TMDBID: 63174, MediaType: "tv", Title: "Lucifer", Year: "2016"},
		{TMDBID: 66732, MediaType: "tv", Title: "Stranger Things", Year: "2016"},
		{TMDBID: 335984, MediaType: "movie", Title: "Blade Runner 2049", Year: "2017"},
		{TMDBID: 693134, MediaType: "movie", Title: "Dune: Part Two", Year: "2024"},
	}

	selections, err := svc.Rerank(ctx, profile, pool, 4)
	if err != nil {
		t.Fatalf("rerank: %v", err)
	}
	if len(selections) == 0 {
		t.Fatal("expected at least one selection")
	}

	allowed := make(map[string]bool, len(pool))
	for _, c := range pool {
		allowed[key(c.TMDBID, c.MediaType)] = true
	}
	for i, sel := range selections {
		if !allowed[key(sel.TMDBID, sel.MediaType)] {
			t.Errorf("selection %d is not from the pool: %+v", i, sel)
		}
		if sel.Reason == "" {
			t.Errorf("selection %d has empty reason", i)
		}
		t.Logf("#%d  %s:%d — %s", i+1, sel.MediaType, sel.TMDBID, sel.Reason)
	}
}
