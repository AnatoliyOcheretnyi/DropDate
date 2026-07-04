package moodpicker

import (
	"context"
	"testing"
)

// TestNextStep_RulesBranching walks the deterministic flow and checks that mood
// comes first, the mood sub-branch appears, and the flow terminates.
func TestNextStep_RulesBranching(t *testing.T) {
	svc := NewService(nil, nil, nil)
	ctx := context.Background()

	// Empty answers -> mood first.
	res, err := svc.NextStep(ctx, "quick", map[string]string{}, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Done || res.Question == nil || res.Question.ID != "mood" {
		t.Fatalf("first question must be mood, got %+v", res)
	}

	// mood=scary -> the scary sub-branch becomes the next question.
	res, err = svc.NextStep(ctx, "quick", map[string]string{"mood": "scary"}, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Question == nil || res.Question.ID != "scary_type" {
		t.Fatalf("after mood=scary next must be scary_type, got %+v", res.Question)
	}

	// mood=cozy has no sub-branch -> next is region (first unconditional slot).
	res, err = svc.NextStep(ctx, "quick", map[string]string{"mood": "cozy"}, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Question == nil || res.Question.ID != "region" {
		t.Fatalf("mood with no sub-branch must skip to region, got %+v", res.Question)
	}

	// Fully answered quick flow -> Done.
	full := map[string]string{
		"mood": "scary", "scary_type": "psychological",
		"region": "asia", "time": "short", "discovery": "hidden",
	}
	res, err = svc.NextStep(ctx, "quick", full, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !res.Done {
		t.Fatalf("expected Done for a fully answered flow, got %+v", res)
	}
}

// TestNextStep_InvalidAnswer rejects unknown options.
func TestNextStep_InvalidAnswer(t *testing.T) {
	svc := NewService(nil, nil, nil)
	_, err := svc.NextStep(context.Background(), "quick", map[string]string{"mood": "bogus"}, false)
	if err == nil {
		t.Fatal("expected error for invalid answer")
	}
}
