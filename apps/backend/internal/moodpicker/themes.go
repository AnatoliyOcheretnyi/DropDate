package moodpicker

import (
	"github.com/AnatoliyOcheretnyi/dropdate/internal/themes"
)

// themeQuestionID is the id of the thematic step. It is asked right after the
// mood (and its sub-branch) so the offered themes can be narrowed to what
// actually fits the chosen mood -- offering "Психлікарня" to someone who wants
// to cheer up is noise.
const themeQuestionID = "theme"

const themeQuestionTitle = "Яка тема?"

// anyThemeOption is always offered first so the thematic step stays skippable.
var anyThemeOption = Option{ID: themes.AnyID, Label: "Будь-яка тема", Emoji: "🎲"}

// themesByMood is the fallback shortlist per mood, used when the mood has no
// sub-branch answer yet (or its sub-branch has no dedicated list).
var themesByMood = map[string][]string{
	"lift":       {"teen_comedy", "romcom", "friendship", "food", "animals", "workplace", "christmas", "sport"},
	"cry":        {"illness", "grief", "family", "true_romance", "mental_health", "parenthood", "redemption", "true_story"},
	"adrenaline": {"heist", "revenge", "martial_arts", "survival", "spy", "hostage", "apocalypse", "superhero"},
	"think":      {"mindbender", "true_story", "injustice", "politics", "ai_robots", "dystopia", "memory", "war"},
	"cozy":       {"romcom", "food", "animals", "small_town", "christmas", "coming_of_age", "magic", "friendship"},
	"scary":      {"haunted", "possession", "zombie", "slasher", "cult", "asylum", "serial_killer", "vampire"},
}

// themesBySubBranch sharpens the shortlist once the mood sub-branch is known.
// Keys are "<mood question id>:<answer>".
var themesBySubBranch = map[string][]string{
	"scary_type:psychological": {"asylum", "mental_health", "mindbender", "cult", "serial_killer", "trauma"},
	"scary_type:supernatural":  {"haunted", "possession", "vampire", "cult", "magic"},
	"scary_type:gore":          {"slasher", "zombie", "serial_killer", "cult"},
	"scary_type:suspense":      {"serial_killer", "detective", "hostage", "conspiracy", "mindbender"},

	"think_type:mindbender": {"mindbender", "time_travel", "ai_robots", "memory", "dystopia"},
	"think_type:true_story": {"true_story", "ww2", "injustice", "politics", "spy", "sport"},
	"think_type:slow_burn":  {"grief", "family", "midlife", "memory", "artists", "small_town"},
	"think_type:social":     {"injustice", "immigration", "lgbt", "feminism", "politics", "war"},

	"cry_type:romance": {"true_romance", "first_love", "forbidden_love", "love_triangle", "marriage"},
	"cry_type:life":    {"illness", "family", "parenthood", "midlife", "redemption", "immigration"},
	"cry_type:loss":    {"grief", "illness", "war", "memory", "family"},

	"pace:nonstop":   {"heist", "hostage", "apocalypse", "martial_arts", "revenge"},
	"pace:stylish":   {"heist", "mafia", "spy", "revenge", "serial_killer"},
	"pace:adventure": {"survival", "road_trip", "pirates", "space", "myth", "dinosaurs"},
}

// subBranchIDs are the mood follow-up questions that can narrow the theme list.
var subBranchIDs = []string{"scary_type", "think_type", "pace", "cry_type"}

// themeIDsFor returns the shortlist of theme ids to offer for the answers so
// far: the sub-branch list when one applies, otherwise the mood list.
func themeIDsFor(answers map[string]string) []string {
	for _, id := range subBranchIDs {
		if answer := answers[id]; answer != "" {
			if ids, ok := themesBySubBranch[id+":"+answer]; ok {
				return ids
			}
		}
	}
	return themesByMood[answers["mood"]]
}

// themeQuestionFor builds the contextual theme question. It returns false when
// the chosen mood has no shortlist, so the flow skips the step entirely rather
// than showing an empty or generic list.
func themeQuestionFor(answers map[string]string) (Question, bool) {
	ids := themeIDsFor(answers)
	if len(ids) == 0 {
		return Question{}, false
	}
	picked := themes.Pick(ids...)
	if len(picked) == 0 {
		return Question{}, false
	}
	options := make([]Option, 0, len(picked)+1)
	options = append(options, anyThemeOption)
	for _, theme := range picked {
		options = append(options, Option{ID: theme.ID, Label: theme.Label, Emoji: theme.Emoji})
	}
	return Question{
		ID:      themeQuestionID,
		Title:   themeQuestionTitle,
		Type:    "single",
		Options: options,
	}, true
}

// themeQuestionAll is the union of every catalog theme. It is what validation
// and the legacy (non-adaptive) schema endpoint see, so any theme a narrowed
// question could offer is always a valid answer.
func themeQuestionAll() Question {
	all := themes.All()
	options := make([]Option, 0, len(all)+1)
	options = append(options, anyThemeOption)
	for _, theme := range all {
		options = append(options, Option{ID: theme.ID, Label: theme.Label, Emoji: theme.Emoji})
	}
	return Question{
		ID:      themeQuestionID,
		Title:   themeQuestionTitle,
		Type:    "single",
		Options: options,
	}
}
