package vibe

import "testing"

// The matcher is the floor the feature stands on: with Gemini off or out of
// quota, plain phrases must still resolve.
func TestMatchPlanReadsPlainPhrases(t *testing.T) {
	cases := []struct {
		phrase string
		theme  string
		genre  string
	}{
		{"комедія з привидами", "haunted", "comedy"},
		{"молодіжний жах де багато крові", "slasher", "horror"},
		{"детектив у маленькому місті", "detective", "crime"},
		{"фільм про перше кохання", "first_love", ""},
	}

	for _, tc := range cases {
		plan := matchPlan(tc.phrase)
		if tc.theme != "" && !containsString(plan.Themes, tc.theme) {
			t.Fatalf("%q → themes %v, want %q", tc.phrase, plan.Themes, tc.theme)
		}
		if tc.genre != "" && !containsString(plan.Genres, tc.genre) {
			t.Fatalf("%q → genres %v, want %q", tc.phrase, plan.Genres, tc.genre)
		}
	}
}

func TestMatchPlanPicksUpCountries(t *testing.T) {
	plan := matchPlan("корейський трилер")
	if !containsString(plan.Countries, "KR") {
		t.Fatalf("countries = %v, want KR", plan.Countries)
	}
}

func TestMatchPlanReturnsNothingForAPhraseItCannotRead(t *testing.T) {
	// This is what the model is for; the matcher must not guess.
	if plan := matchPlan("щось таке легке на вечір"); !plan.IsEmpty() {
		t.Fatalf("expected an empty plan, got %+v", plan)
	}
}
