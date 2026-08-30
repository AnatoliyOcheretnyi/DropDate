package vibe

import (
	"strings"
	"unicode"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/themes"
)

// matchPlan reads a phrase without any AI: it looks for theme and genre words
// in it. This is the floor the feature stands on — when Gemini is off, out of
// quota or returns nothing usable, "комедія з привидами" still resolves,
// because both words are in the catalog. Subtler phrasing ("щось легке на
// вечір") is exactly what it misses, and what the model is for.
func matchPlan(phrase string) Plan {
	words := tokenize(phrase)
	if len(words) == 0 {
		return Plan{}
	}

	plan := Plan{Source: SourceKeywords}

	for _, genre := range genreCatalog {
		if matchesAny(words, genreHints[genre.Slug]) {
			plan.Genres = append(plan.Genres, genre.Slug)
		}
	}
	for _, theme := range themes.All() {
		hints := themeHints[theme.ID]
		if len(hints) == 0 {
			hints = labelHints(theme.Label)
		}
		if matchesAny(words, hints) {
			plan.Themes = append(plan.Themes, theme.ID)
		}
	}
	for _, country := range countryCatalog {
		hints := countryHints[country.Code]
		if len(hints) == 0 {
			hints = labelHints(country.Label)
		}
		if matchesAny(words, hints) {
			plan.Countries = append(plan.Countries, country.Code)
		}
	}

	return plan
}

// tokenize splits a phrase into lowercase word stems. Ukrainian inflects
// heavily ("привидами", "кров'ю"), so words are compared by prefix rather than
// by equality, and the stem is what carries the meaning.
func tokenize(phrase string) []string {
	fields := strings.FieldsFunc(strings.ToLower(phrase), func(r rune) bool {
		return !unicode.IsLetter(r) && !unicode.IsDigit(r)
	})
	out := make([]string, 0, len(fields))
	for _, field := range fields {
		if len([]rune(field)) >= 3 {
			out = append(out, field)
		}
	}
	return out
}

// matchesAny reports whether any word in the phrase starts with one of the
// hints (or the other way round for short hints).
func matchesAny(words, hints []string) bool {
	for _, hint := range hints {
		for _, word := range words {
			if strings.HasPrefix(word, hint) || strings.HasPrefix(hint, word) {
				return true
			}
		}
	}
	return false
}

// labelHints derives hints from a catalog label: its words, stemmed by dropping
// the last two letters, which covers most Ukrainian endings.
func labelHints(label string) []string {
	var hints []string
	for _, word := range tokenize(label) {
		runes := []rune(word)
		if len(runes) > 5 {
			word = string(runes[:len(runes)-2])
		}
		hints = append(hints, word)
	}
	return hints
}

// genreHints are the words people actually type for a genre, beyond its label.
var genreHints = map[string][]string{
	"action":    {"бойов", "екшн", "бійк"},
	"comedy":    {"комед", "смішн", "весел", "поржат"},
	"drama":     {"драм", "серйозн"},
	"scifi":     {"фантаст", "sci", "космос", "космічн"},
	"horror":    {"жах", "хорор", "страшн", "лякал"},
	"thriller":  {"трилер", "напруж", "саспенс"},
	"romance":   {"романт", "любов", "коханн", "мелодрам"},
	"adventure": {"пригод", "мандр"},
	"animation": {"анімац", "мультф", "мультик", "аніме"},
	"fantasy":   {"фентез", "магі", "чарівн"},
	"crime":     {"детект", "кримінал", "розслід"},
	"docs":      {"документ", "док"},
	"family":    {"сімейн", "родин", "дитяч"},
	"history":   {"історичн", "історі"},
	"music":     {"музичн", "музик", "мюзикл"},
	"mystery":   {"містик", "таємн", "загадк"},
	"war":       {"війн", "воєнн"},
	"western":   {"вестерн", "ковбо"},
}

// themeHints cover the themes whose label is not what people type: nobody
// writes "маніяк і слешер", they write "багато крові".
var themeHints = map[string][]string{
	"slasher":       {"слешер", "маніяк", "кров", "різанин", "мясорубк"},
	"haunted":       {"привид", "примар", "будинок з привидами", "полтергейст"},
	"possession":    {"одержим", "екзорц", "демон", "дьявол"},
	"zombie":        {"зомбі", "епідемі", "апокаліпс"},
	"vampire":       {"вампір", "вовкулак", "перевертн"},
	"cult":          {"секта", "культ"},
	"teen_comedy":   {"молодіжн", "підлітк", "тінейдж", "випускн"},
	"coming_of_age": {"дорослішанн", "юність", "молодіжн", "підлітк"},
	"school":        {"школ", "вчител", "клас"},
	"college":       {"студент", "універ", "коледж"},
	"first_love":    {"перше коханн", "перша любов", "закохан"},
	"true_romance":  {"любов", "коханн", "романтичн"},
	"romcom":        {"ромком", "романтичн комед"},
	"heist":         {"пограбув", "крадіжк", "ограблен"},
	"serial_killer": {"серійн", "вбивц"},
	"detective":     {"детект", "розслід", "слідств"},
	"revenge":       {"помст", "відплат"},
	"prison":        {"тюрм", "вязниц"},
	"spy":           {"шпигун", "агент", "розвідк"},
	"mafia":         {"мафі", "банд", "гангстер"},
	"illness":       {"хвороб", "рак", "лікарн"},
	"grief":         {"втрат", "гор", "смерт"},
	"family":        {"сімей", "родин"},
	"friendship":    {"дружб", "друз"},
	"true_story":    {"реальн", "справжн істор", "біограф"},
	"mindbender":    {"твіст", "головоломк", "несподіван"},
	"mental_health": {"психік", "депрес", "ментальн"},
	"trauma":        {"травм", "птср"},
	"memory":        {"памят", "амнезі"},

	// The adult themes: the words people actually type for them are never the
	// label, and half of them are the ones a stemmer would mangle.
	"erotica": {
		"еротик", "оголенн", "оголен", "голі", "гола", "голих",
		"звабл", "спокус", "сексуальн", "секс", "чуттєв", "відверт",
		"пікантн", "постільн",
	},
	"gore": {
		"жорсток", "жорстк", "кров", "кривав", "різанин", "розчленув",
		"мясорубк", "мʼясорубк", "брутальн", "бійн", "трешов",
	},
	// No "важк" here on purpose: "щось важке про сімʼю" is a slow drama, not a
	// film about torture, and the hint would drag one into the other.
	"disturbing": {
		"катуван", "тортур", "шокуюч", "огидн", "канібал", "нещадн",
		"садизм", "збоченн",
	},
}

// countryHints match the adjective people actually type ("корейський"), which
// no amount of stemming turns into the country's own name ("Корея").
var countryHints = map[string][]string{
	"US": {"америк", "сша", "голлівуд"},
	"GB": {"британ", "англій"},
	"KR": {"корей", "корея", "південнокорей"},
	"JP": {"япон"},
	"UA": {"україн"},
	"FR": {"француз", "франці"},
	"ES": {"іспан"},
	"IN": {"індій", "боллівуд"},
	"DE": {"німец", "німеч"},
	"IT": {"італій", "італі"},
	"PL": {"польськ", "польщ"},
	"SE": {"швед"},
	"DK": {"данськ", "данії"},
	"NO": {"норвез", "норвег"},
	"CA": {"канад"},
	"AU": {"австралій"},
	"CN": {"китай", "китайськ"},
	"TW": {"тайван"},
	"HK": {"гонконг"},
	"TH": {"тайськ", "таїланд"},
	"TR": {"турец", "туреч"},
	"BR": {"бразил"},
	"MX": {"мексик"},
	"AR": {"аргентин"},
}

// SourceAI and SourceKeywords record how a plan was produced.
const (
	SourceAI       = "ai"
	SourceKeywords = "keywords"
)
