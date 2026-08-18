package cinematch

import (
	"github.com/AnatoliyOcheretnyi/dropdate/internal/themes"
)

// themeQuestionID is the id of the thematic step.
const themeQuestionID = "theme"

// matchThemeIDs is the shortlist offered here. Unlike the mood picker, cinematch
// serves its whole question flow up front, so the list cannot be narrowed by
// earlier answers -- it is a deliberately broad, cross-genre selection that
// works for both films and series.
var matchThemeIDs = []string{
	"true_story", "family", "illness", "mental_health",
	"true_romance", "coming_of_age", "teen_comedy", "detective",
	"heist", "revenge", "survival", "apocalypse",
	"space", "magic", "war", "sport",
}

// themeQuestion builds the thematic step, with the skip option first.
func themeQuestion() Question {
	picked := themes.Pick(matchThemeIDs...)
	options := make([]Option, 0, len(picked)+1)
	options = append(options, Option{ID: themes.AnyID, Label: "Будь-яка", Emoji: "🎲"})
	for _, theme := range picked {
		options = append(options, Option{ID: theme.ID, Label: theme.Label, Emoji: theme.Emoji})
	}
	return Question{
		ID:        themeQuestionID,
		Title:     "Про що хочеш подивитись?",
		Type:      "single",
		AppliesTo: "both",
		Options:   options,
	}
}
