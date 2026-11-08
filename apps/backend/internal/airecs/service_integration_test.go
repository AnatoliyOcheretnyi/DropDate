package airecs

import (
	"context"
	"encoding/json"
	"os"
	"testing"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/config"
)

// Optional live smoke: AI_SMOKE_POOL points to a public /world JSON response.
// Normal test runs do not load credentials or make billable model requests.
func TestLiveRerankPublicWorldPool(t *testing.T) {
	path := os.Getenv("AI_SMOKE_POOL")
	if path == "" {
		t.Skip("set AI_SMOKE_POOL to opt into the live Gemini smoke")
	}
	config.LoadEnvFiles("../../.env", "../../.env.local")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var response struct {
		Items []Candidate `json:"items"`
	}
	if err := json.Unmarshal(data, &response); err != nil {
		t.Fatal(err)
	}
	if len(response.Items) == 0 {
		t.Fatal("empty public candidate fixture")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	s, err := NewService(ctx, os.Getenv("GEMINI_API_KEY"), os.Getenv("GEMINI_MODEL"), nil)
	if err != nil {
		t.Fatal(err)
	}
	start := time.Now()
	items, err := s.Rerank(ctx, []TasteSignal{{Title: "Preferred genre: animation", Sentiment: "favorite"}}, response.Items, min(18, len(response.Items)))
	if err != nil {
		t.Fatal(err)
	}
	if len(items) == 0 {
		t.Fatal("no validated model selections")
	}
	for _, item := range items {
		if item.Reason == "" {
			t.Fatal("model omitted explanation")
		}
	}
	t.Logf("validated selections=%d duration=%s", len(items), time.Since(start))
}
