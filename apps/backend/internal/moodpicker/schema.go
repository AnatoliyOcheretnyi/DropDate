package moodpicker

import "strings"

// schemaVersion lets the client cache-bust if the question set changes.
const schemaVersion = 3

// DefaultDepth is used when a request omits or sends an unknown depth.
const DefaultDepth = "standard"

// knownDepths is the set of supported depths (controls flow length).
var knownDepths = map[string]bool{"quick": true, "standard": true}

// questions is the static definition of every question, keyed by id. The
// branching flow (flow.go) references these ids; the AI strategy may only pick
// from this bank, so it can never invent a question.
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
	// Mood sub-branches — asked only when the matching mood is chosen.
	"scary_type": {
		ID:    "scary_type",
		Title: "Який саме страх?",
		Type:  "single",
		Options: []Option{
			{ID: "psychological", Label: "Психологічний", Emoji: "🌀"},
			{ID: "supernatural", Label: "Надприродне", Emoji: "🔮"},
			{ID: "gore", Label: "Жорсткий", Emoji: "🩸"},
			{ID: "suspense", Label: "Саспенс", Emoji: "😰"},
		},
	},
	"think_type": {
		ID:    "think_type",
		Title: "Про що поміркувати?",
		Type:  "single",
		Options: []Option{
			{ID: "mindbender", Label: "Головоломка", Emoji: "🧩"},
			{ID: "true_story", Label: "Реальні події", Emoji: "📖"},
			{ID: "slow_burn", Label: "Повільне занурення", Emoji: "🕯️"},
			{ID: "social", Label: "Соціальне", Emoji: "🌍"},
		},
	},
	"pace": {
		ID:    "pace",
		Title: "Який темп?",
		Type:  "single",
		Options: []Option{
			{ID: "nonstop", Label: "Нон-стоп екшн", Emoji: "💥"},
			{ID: "stylish", Label: "Стильний бойовик", Emoji: "🕶️"},
			{ID: "adventure", Label: "Пригода", Emoji: "🗺️"},
		},
	},
	"cry_type": {
		ID:    "cry_type",
		Title: "Яка драма?",
		Type:  "single",
		Options: []Option{
			{ID: "romance", Label: "Романтична", Emoji: "💔"},
			{ID: "life", Label: "Життєва історія", Emoji: "🌿"},
			{ID: "loss", Label: "Про втрату", Emoji: "🕊️"},
		},
	},
	"region": {
		ID:    "region",
		Title: "Звідки кіно?",
		Type:  "single",
		Options: []Option{
			{ID: "any", Label: "Будь-яке", Emoji: "🌍"},
			{ID: "local", Label: "Українське / СНД", Emoji: "🇺🇦"},
			{ID: "usa", Label: "США", Emoji: "🇺🇸"},
			{ID: "uk", Label: "Британія", Emoji: "🇬🇧"},
			{ID: "korea", Label: "Корея", Emoji: "🇰🇷"},
			{ID: "japan", Label: "Японія", Emoji: "🇯🇵"},
			{ID: "france", Label: "Франція", Emoji: "🇫🇷"},
			{ID: "india", Label: "Індія", Emoji: "🇮🇳"},
			{ID: "europe", Label: "Європа (інша)", Emoji: "🇪🇺"},
			{ID: "nordic", Label: "Скандинавія", Emoji: "❄️"},
			{ID: "asia", Label: "Азія (інша)", Emoji: "🎌"},
			{ID: "latam", Label: "Латинська Америка", Emoji: "🌴"},
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

// The theme step is contextual: the question served by the adaptive flow is
// narrowed to the chosen mood, while the entry registered here is the union of
// every catalog theme. Validation reads this map, so any theme a narrowed
// question can offer is always accepted.
func init() {
	questions[themeQuestionID] = themeQuestionAll()
}

// questionFor returns the question to ask for an id, contextualised by the
// answers so far. Only the theme step is contextual; every other question is
// static, and an unknown or inapplicable id reports false.
func questionFor(id string, answers map[string]string) (Question, bool) {
	if id == themeQuestionID {
		return themeQuestionFor(answers)
	}
	q, ok := questions[id]
	return q, ok
}

// NormalizeDepth maps an input depth to a supported one, falling back to default.
func NormalizeDepth(depth string) string {
	depth = strings.TrimSpace(strings.ToLower(depth))
	if knownDepths[depth] {
		return depth
	}
	return DefaultDepth
}

// QuestionsForDepth returns the unconditional question path for a depth (no
// branching context). It backs the legacy GET /mood/questions; the adaptive
// flow is driven step-by-step via Service.NextStep instead.
func QuestionsForDepth(depth string) QuestionSet {
	depth = NormalizeDepth(depth)
	items := make([]Question, 0)
	seen := make(map[string]bool)
	for _, slot := range flowFor(depth) {
		id := slot.resolve(map[string]string{})
		if id == "" || seen[id] {
			continue
		}
		seen[id] = true
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
