package moodpicker

import "strings"

// schemaVersion lets the client cache-bust if the question set changes.
const schemaVersion = 1

// Supported depths and the question ids they include.
var depthQuestions = map[string][]string{
	"quick":    {"mood", "time", "discovery"},
	"standard": {"mood", "company", "time", "era", "discovery"},
}

// DefaultDepth is used when a request omits or sends an unknown depth.
const DefaultDepth = "standard"

// questions is the static definition of every question, keyed by id.
var questions = map[string]Question{
	"mood": {
		ID:    "mood",
		Title: "Який у тебе настрій?",
		Type:  "single",
		Options: []Option{
			{ID: "lift", Label: "Підняти настрій", Emoji: "😄"},
			{ID: "cry", Label: "Поплакати", Emoji: "😢"},
			{ID: "adrenaline", Label: "Адреналін", Emoji: "🔥"},
			{ID: "think", Label: "Подумати", Emoji: "🧠"},
			{ID: "cozy", Label: "Затишний вечір", Emoji: "🛋️"},
			{ID: "scary", Label: "Полоскотати нерви", Emoji: "👻"},
		},
	},
	"company": {
		ID:    "company",
		Title: "З ким дивишся?",
		Type:  "single",
		Options: []Option{
			{ID: "solo", Label: "Сам/сама", Emoji: "🧍"},
			{ID: "couple", Label: "Удвох", Emoji: "❤️"},
			{ID: "friends", Label: "З друзями", Emoji: "🎉"},
			{ID: "family", Label: "Сім'я з дітьми", Emoji: "👨‍👩‍👧"},
		},
	},
	"time": {
		ID:    "time",
		Title: "Скільки маєш часу?",
		Type:  "single",
		Options: []Option{
			{ID: "short", Label: "До 90 хвилин", Emoji: "⏱️"},
			{ID: "standard", Label: "Близько 2 годин", Emoji: "🕑"},
			{ID: "any", Label: "Не важливо", Emoji: "🤷"},
		},
	},
	"era": {
		ID:    "era",
		Title: "Яка епоха?",
		Type:  "single",
		Options: []Option{
			{ID: "fresh", Label: "Свіже (2018+)", Emoji: "✨"},
			{ID: "modern", Label: "2000-х і новіше", Emoji: "📀"},
			{ID: "classic", Label: "Класика (до 2000)", Emoji: "🎞️"},
			{ID: "any", Label: "Не важливо", Emoji: "🤷"},
		},
	},
	"discovery": {
		ID:    "discovery",
		Title: "Що шукаєш?",
		Type:  "single",
		Options: []Option{
			{ID: "popular", Label: "Популярне і перевірене", Emoji: "⭐"},
			{ID: "hidden", Label: "Приховані перлини", Emoji: "💎"},
		},
	},
}

// NormalizeDepth maps an input depth to a supported one, falling back to default.
func NormalizeDepth(depth string) string {
	depth = strings.TrimSpace(strings.ToLower(depth))
	if _, ok := depthQuestions[depth]; ok {
		return depth
	}
	return DefaultDepth
}

// QuestionsForDepth returns the ordered question set for a depth.
func QuestionsForDepth(depth string) QuestionSet {
	depth = NormalizeDepth(depth)
	ids := depthQuestions[depth]
	items := make([]Question, 0, len(ids))
	for _, id := range ids {
		items = append(items, questions[id])
	}
	return QuestionSet{
		Items: items,
		Meta:  QuestionMeta{Depth: depth, Version: schemaVersion},
	}
}

// optionLabel returns the display label for an answer, or "" if unknown.
func optionLabel(questionID, optionID string) string {
	q, ok := questions[questionID]
	if !ok {
		return ""
	}
	for _, opt := range q.Options {
		if opt.ID == optionID {
			return opt.Label
		}
	}
	return ""
}

// validOption reports whether optionID is a known answer for questionID.
func validOption(questionID, optionID string) bool {
	return optionLabel(questionID, optionID) != ""
}
