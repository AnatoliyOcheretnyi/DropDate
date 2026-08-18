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

	// mood=cozy has no sub-branch -> next is the theme step, narrowed to the
	// themes that fit a cozy evening and always skippable via "any".
	res, err = svc.NextStep(ctx, "quick", map[string]string{"mood": "cozy"}, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Question == nil || res.Question.ID != themeQuestionID {
		t.Fatalf("mood with no sub-branch must go to the theme step, got %+v", res.Question)
	}
	if len(res.Question.Options) == 0 || res.Question.Options[0].ID != "any" {
		t.Fatalf("theme step must offer the skip option first, got %+v", res.Question.Options)
	}
	for _, opt := range res.Question.Options[1:] {
		if !validOption(themeQuestionID, opt.ID) {
			t.Fatalf("narrowed theme option %q is not a valid answer", opt.ID)
		}
	}

	// After the theme is answered the flow returns to the unconditional slots.
	res, err = svc.NextStep(ctx, "quick", map[string]string{"mood": "cozy", themeQuestionID: "food"}, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Question == nil || res.Question.ID != "region" {
		t.Fatalf("after the theme step next must be region, got %+v", res.Question)
	}

	// Fully answered quick flow -> Done.
	full := map[string]string{
		"mood": "scary", "scary_type": "psychological", themeQuestionID: "asylum",
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
