//go:build integration

package airecs

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/moodpicker"
)

// TestNextQuestionIDIntegration exercises the real Gemini API for mood
// branching. Run explicitly with `go test -tags=integration`; release checks
// stay deterministic and must not depend on external quota.
func TestNextQuestionIDIntegration(t *testing.T) {
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

	answered := []moodpicker.AnsweredQuestion{
		{QuestionID: "mood", QuestionTitle: "Який у тебе настрій?", OptionID: "scary", OptionLabel: "Полоскотати нерви"},
	}
	candidates := []moodpicker.Question{
		{ID: "scary_type", Title: "Який саме страх?", Type: "single", Options: []moodpicker.Option{
			{ID: "psychological", Label: "Психологічний"},
			{ID: "supernatural", Label: "Надприродне"},
		}},
		{ID: "region", Title: "Звідки кіно?", Type: "single", Options: []moodpicker.Option{
			{ID: "asia", Label: "Азія"},
			{ID: "any", Label: "Будь-яке"},
		}},
		{ID: "time", Title: "Скільки маєш часу?", Type: "single", Options: []moodpicker.Option{
			{ID: "short", Label: "До 90 хвилин"},
		}},
	}

	id, err := svc.NextQuestionID(ctx, answered, candidates)
	if err != nil {
		t.Fatalf("next question: %v", err)
	}
	allowed := map[string]bool{"scary_type": true, "region": true, "time": true}
	if !allowed[id] {
		t.Fatalf("returned id %q is not a candidate", id)
	}
	t.Logf("Gemini picked next question: %s", id)
}
