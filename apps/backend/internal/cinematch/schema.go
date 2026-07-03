package cinematch

const schemaVersion = 2

// questionFlow is the fixed, ordered narrowing flow. The media question comes
// first; the client then filters by AppliesTo so a session is ~10 steps for both
// movies and series.
var questionFlow = []Question{
	{
		ID: "media", Title: "Фільм чи серіал?", Type: "single", AppliesTo: "both",
		Options: []Option{
			{ID: "movie", Label: "Фільм", Emoji: "🎬"},
			{ID: "tv", Label: "Серіал", Emoji: "📺"},
		},
	},
	{
		ID: "genre", Title: "Який жанр?", Type: "single", AppliesTo: "both",
		Options: []Option{
			{ID: "action", Label: "Екшн", Emoji: "💥"},
			{ID: "drama", Label: "Драма", Emoji: "🎭"},
			{ID: "comedy", Label: "Комедія", Emoji: "😄"},
			{ID: "scary", Label: "Жахи/трилер", Emoji: "👻"},
			{ID: "scifi", Label: "Фантастика/фентезі", Emoji: "🚀"},
			{ID: "romance", Label: "Романтика", Emoji: "❤️"},
			{ID: "crime", Label: "Детектив/кримінал", Emoji: "🕵️"},
			{ID: "any", Label: "Будь-який", Emoji: "🎲"},
		},
	},
	{
		ID: "note", Title: "Додати відтінок?", Type: "single", AppliesTo: "both",
		Options: []Option{
			{ID: "none", Label: "Не треба", Emoji: "➖"},
			{ID: "romance", Label: "Романтику", Emoji: "❤️"},
			{ID: "comedy", Label: "Гумор", Emoji: "😄"},
			{ID: "thriller", Label: "Напругу", Emoji: "🔪"},
			{ID: "mystery", Label: "Таємницю", Emoji: "🔍"},
			{ID: "drama", Label: "Драму", Emoji: "🎭"},
		},
	},
	{
		ID: "origin", Title: "Звідки?", Type: "single", AppliesTo: "both",
		Options: []Option{
			{ID: "any", Label: "Будь-звідки", Emoji: "🌍"},
			{ID: "hollywood", Label: "Голлівуд", Emoji: "🎬"},
			{ID: "anime", Label: "Аніме", Emoji: "🌸"},
			{ID: "dorama", Label: "Дорама", Emoji: "🇰🇷"},
		},
	},
	{
		ID: "era", Title: "Яка епоха?", Type: "single", AppliesTo: "both",
		Options: []Option{
			{ID: "fresh", Label: "Свіже (2018+)", Emoji: "✨"},
			{ID: "tens", Label: "2010-ті", Emoji: "📱"},
			{ID: "modern", Label: "2000-ні", Emoji: "📀"},
			{ID: "classic", Label: "Класика (до 2000)", Emoji: "🎞️"},
			{ID: "any", Label: "Не важливо", Emoji: "🤷"},
		},
	},
	{
		ID: "tone", Title: "Який тон?", Type: "single", AppliesTo: "both",
		Options: []Option{
			{ID: "light", Label: "Легке", Emoji: "🌤️"},
			{ID: "serious", Label: "Серйозне", Emoji: "🌑"},
			{ID: "any", Label: "Будь-який", Emoji: "🤷"},
		},
	},
	{
		ID: "rating", Title: "Наскільки прискіпливий до оцінок?", Type: "single", AppliesTo: "both",
		Options: []Option{
			{ID: "high", Label: "Тільки високо оцінене", Emoji: "🏆"},
			{ID: "any", Label: "Будь-який рейтинг", Emoji: "🤷"},
		},
	},
	{
		ID: "popularity", Title: "Що цікавить?", Type: "single", AppliesTo: "both",
		Options: []Option{
			{ID: "popular", Label: "Популярне", Emoji: "⭐"},
			{ID: "hidden", Label: "Приховані перлини", Emoji: "💎"},
			{ID: "any", Label: "Будь-яке", Emoji: "🤷"},
		},
	},
	{
		ID: "length", Title: "Який хронометраж?", Type: "single", AppliesTo: "movie",
		Options: []Option{
			{ID: "short", Label: "Коротке (до 90 хв)", Emoji: "⏱️"},
			{ID: "standard", Label: "Стандарт (~2 год)", Emoji: "🕑"},
			{ID: "long", Label: "Епічне (2.5+ год)", Emoji: "🎬"},
			{ID: "any", Label: "Не важливо", Emoji: "🤷"},
		},
	},
	{
		ID: "audience", Title: "Для якої аудиторії?", Type: "single", AppliesTo: "movie",
		Options: []Option{
			{ID: "family", Label: "Сімейне", Emoji: "👨‍👩‍👧"},
			{ID: "adult", Label: "Доросле", Emoji: "🔞"},
			{ID: "any", Label: "Будь-яке", Emoji: "🤷"},
		},
	},
	{
		ID: "format", Title: "Який формат серіалу?", Type: "single", AppliesTo: "tv",
		Options: []Option{
			{ID: "mini", Label: "Міні-серіал", Emoji: "📼"},
			{ID: "multi", Label: "Багатосезонний", Emoji: "📚"},
			{ID: "any", Label: "Не важливо", Emoji: "🤷"},
		},
	},
	{
		ID: "status", Title: "У якому статусі?", Type: "single", AppliesTo: "tv",
		Options: []Option{
			{ID: "ongoing", Label: "Ще виходить", Emoji: "🔴"},
			{ID: "ended", Label: "Завершений", Emoji: "✅"},
			{ID: "any", Label: "Не важливо", Emoji: "🤷"},
		},
	},
}

func questionByID(id string) (Question, bool) {
	for _, q := range questionFlow {
		if q.ID == id {
			return q, true
		}
	}
	return Question{}, false
}

func optionLabel(questionID, optionID string) string {
	q, ok := questionByID(questionID)
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

func validOption(questionID, optionID string) bool {
	return optionLabel(questionID, optionID) != ""
}
