package akinator

import (
	"fmt"
	"sort"
	"strings"
	"time"
)

// Feature is one askable yes/no property, materialized as a bitmap over the
// movie snapshot (Has[i] answers "does movie i have it?").
type Feature struct {
	ID   string
	Text string
	Has  []bool
	// Robust features (genres, decades, franchise) are ones players answer
	// confidently; fuzzier ones get a small selection penalty.
	Robust bool
}

const (
	minKeywordDF   = 12
	maxKeywordFrac = 0.35
	minActorDF     = 5
	minDirectorDF  = 3
	maxKeywords    = 400
	maxActors      = 150
	maxDirectors   = 60
)

var genreQuestions = map[int]string{
	28:    "Це бойовик?",
	12:    "Це пригодницький фільм?",
	16:    "Це анімаційний фільм?",
	35:    "Це комедія?",
	80:    "Це кримінальний фільм?",
	99:    "Це документальний фільм?",
	18:    "Це драма?",
	10751: "Це сімейний фільм?",
	14:    "Це фентезі?",
	36:    "Це історичний фільм?",
	27:    "Це фільм жахів?",
	10402: "Це фільм про музику чи мюзикл?",
	9648:  "У сюжеті є загадка чи таємниця?",
	10749: "Це романтичний фільм?",
	878:   "Це наукова фантастика?",
	53:    "Це трилер?",
	10752: "Це фільм про війну?",
	37:    "Це вестерн?",
}

// keywordQuestions maps common TMDB keyword names (lowercased, English) to a
// natural Ukrainian question. Unmapped keywords fall back to a template.
var keywordQuestions = map[string]string{
	"based on novel or book":         "Фільм знято за книгою?",
	"based on comic":                 "Фільм знято за коміксом?",
	"based on true story":            "Фільм заснований на реальних подіях?",
	"biography":                      "Це біографічний фільм?",
	"superhero":                      "Це фільм про супергероїв?",
	"time travel":                    "У фільмі є подорожі в часі?",
	"sequel":                         "Це сиквел (продовження іншого фільму)?",
	"magic":                          "У фільмі є магія?",
	"zombie":                         "У фільмі є зомбі?",
	"vampire":                        "У фільмі є вампіри?",
	"robot":                          "У фільмі є роботи?",
	"alien":                          "У фільмі є прибульці?",
	"space":                          "Дія відбувається в космосі?",
	"space travel":                   "Дія відбувається в космосі?",
	"dystopia":                       "Дія відбувається в антиутопії?",
	"post-apocalyptic future":        "Дія відбувається після апокаліпсису?",
	"serial killer":                  "У сюжеті є серійний вбивця?",
	"heist":                          "Сюжет крутиться навколо пограбування?",
	"revenge":                        "Сюжет побудований на помсті?",
	"spy":                            "Це фільм про шпигунів?",
	"martial arts":                   "У фільмі є бойові мистецтва?",
	"world war ii":                   "Дія повʼязана з Другою світовою війною?",
	"high school":                    "Дія відбувається у школі?",
	"christmas":                      "Це різдвяний фільм?",
	"wedding":                        "У сюжеті важливе весілля?",
	"road trip":                      "Це фільм-подорож (роуд-муві)?",
	"monster":                        "У фільмі є монстри?",
	"dinosaur":                       "У фільмі є динозаври?",
	"shark":                          "У фільмі є акули?",
	"ghost":                          "У фільмі є привиди?",
	"witch":                          "У фільмі є відьми?",
	"pirate":                         "У фільмі є пірати?",
	"samurai":                        "У фільмі є самураї?",
	"detective":                      "Головний герой — детектив?",
	"prison":                         "Значна частина дії відбувається у вʼязниці?",
	"boxing":                         "Фільм про бокс?",
	"artificial intelligence (a.i.)": "У фільмі є штучний інтелект?",
	"virtual reality":                "У фільмі є віртуальна реальність?",
	"video game":                     "Фільм повʼязаний з відеоіграми?",
	"superpower":                     "У героїв є суперздібності?",
	"dancing":                        "У фільмі важливі танці?",
	"kidnapping":                     "У сюжеті є викрадення людини?",
	"survival":                       "Це історія про виживання?",
	"treasure hunt":                  "Герої шукають скарб?",
	"war":                            "Це фільм про війну?",
	"parody":                         "Це пародія?",
	"anime":                          "Це аніме?",
	"talking animal":                 "У фільмі є тварини, що розмовляють?",
	"dream":                          "Сни відіграють важливу роль у сюжеті?",
	"amnesia":                        "Герой втрачає памʼять?",
	"assassin":                       "Головний герой — найманий вбивця?",
	"mafia":                          "Фільм про мафію?",
	"gangster":                       "Фільм про гангстерів?",
	"police":                         "Головні герої — поліцейські?",
	"lawyer":                         "У сюжеті важливий суд або адвокати?",
	"journalist":                     "Головний герой — журналіст?",
	"boxer":                          "Головний герой — боксер?",
	"musician":                       "Головний герой — музикант?",
	"chef":                           "Головний герой — кухар?",
	"car race":                       "У фільмі є перегони?",
	"car chase":                      "У фільмі є автомобільні погоні?",
	"middle earth (tolkien)":         "Дія відбувається в Середземʼї (світ Толкіна)?",
	"based on video game":            "Фільм знято за відеогрою?",
	"live action remake":             "Це ігровий рімейк анімації?",
	"twist ending":                   "У фільмі несподівана кінцівка?",
}

var europeCountries = map[string]bool{
	"GB": true, "FR": true, "DE": true, "IT": true, "ES": true, "PL": true,
	"SE": true, "NO": true, "DK": true, "FI": true, "NL": true, "BE": true,
	"AT": true, "CH": true, "IE": true, "PT": true, "GR": true, "CZ": true,
	"HU": true, "RO": true, "UA": true,
}

var asiaCountries = map[string]bool{
	"JP": true, "KR": true, "CN": true, "HK": true, "TW": true, "IN": true,
	"TH": true, "ID": true, "PH": true, "VN": true, "IR": true, "TR": true,
}

// BuildFeatureSpace derives the askable feature set from a movie snapshot:
// static metadata splits plus data-driven keyword/actor/director features.
func BuildFeatureSpace(movies []Movie, now time.Time) []Feature {
	n := len(movies)
	if n == 0 {
		return nil
	}
	features := make([]Feature, 0, 64)

	add := func(id, text string, robust bool, has func(Movie) bool) {
		bitmap := make([]bool, n)
		trueCount := 0
		for i, movie := range movies {
			if has(movie) {
				bitmap[i] = true
				trueCount++
			}
		}
		// Skip degenerate splits — they can never discriminate.
		if trueCount == 0 || trueCount == n {
			return
		}
		features = append(features, Feature{ID: id, Text: text, Has: bitmap, Robust: robust})
	}

	// Genres.
	genreIDs := make([]int, 0, len(genreQuestions))
	for genreID := range genreQuestions {
		genreIDs = append(genreIDs, genreID)
	}
	sort.Ints(genreIDs)
	for _, genreID := range genreIDs {
		text := genreQuestions[genreID]
		id := fmt.Sprintf("genre_%d", genreID)
		gid := genreID
		add(id, text, true, func(m Movie) bool {
			for _, g := range m.GenreIDs {
				if g == gid {
					return true
				}
			}
			return false
		})
	}

	// Decades.
	decades := []struct {
		id   string
		text string
		from int
		to   int
	}{
		{"decade_pre1980", "Фільм вийшов до 1980 року?", 0, 1979},
		{"decade_1980s", "Фільм вийшов у 1980-х?", 1980, 1989},
		{"decade_1990s", "Фільм вийшов у 1990-х?", 1990, 1999},
		{"decade_2000s", "Фільм вийшов у 2000-х?", 2000, 2009},
		{"decade_2010s", "Фільм вийшов у 2010-х?", 2010, 2019},
		{"decade_2020s", "Фільм вийшов у 2020-х?", 2020, 2029},
	}
	for _, d := range decades {
		bounds := d
		add(d.id, d.text, true, func(m Movie) bool {
			return m.Year >= bounds.from && m.Year <= bounds.to
		})
	}
	currentYear := now.Year()
	add("recent5", "Фільм вийшов за останні 5 років?", true, func(m Movie) bool {
		return m.Year >= currentYear-5
	})

	// Broad metadata splits.
	add("franchise", "Це частина франшизи або серії фільмів?", true, func(m Movie) bool {
		return m.IsFranchise
	})
	add("lang_en", "Фільм англомовний?", true, func(m Movie) bool {
		return m.OriginalLanguage == "en"
	})
	add("region_us", "Фільм зняли у США?", false, func(m Movie) bool {
		for _, c := range m.OriginCountries {
			if c == "US" {
				return true
			}
		}
		return false
	})
	add("region_europe", "Фільм зняли в Європі?", false, func(m Movie) bool {
		for _, c := range m.OriginCountries {
			if europeCountries[c] {
				return true
			}
		}
		return false
	})
	add("region_asia", "Фільм зняли в Азії?", false, func(m Movie) bool {
		for _, c := range m.OriginCountries {
			if asiaCountries[c] {
				return true
			}
		}
		return false
	})
	add("rating_high", "Фільм має дуже високий рейтинг глядачів (7.5+)?", false, func(m Movie) bool {
		return m.VoteAverage >= 7.5
	})
	add("runtime_long", "Фільм триває понад дві години?", false, func(m Movie) bool {
		return m.Runtime > 125
	})

	// Data-driven vocabularies.
	features = append(features, dynamicFeatures(movies, "kw",
		func(m Movie) []NamedRef { return m.Keywords },
		keywordQuestionText, minKeywordDF, int(float64(n)*maxKeywordFrac), maxKeywords, false)...)
	features = append(features, dynamicFeatures(movies, "actor",
		func(m Movie) []NamedRef { return m.Cast },
		func(name string) string { return fmt.Sprintf("У фільмі грає %s?", name) },
		minActorDF, n, maxActors, true)...)
	features = append(features, dynamicFeatures(movies, "director",
		func(m Movie) []NamedRef { return m.Directors },
		func(name string) string { return fmt.Sprintf("Режисер фільму — %s?", name) },
		minDirectorDF, n, maxDirectors, true)...)

	return features
}

func keywordQuestionText(name string) string {
	if text, ok := keywordQuestions[strings.ToLower(name)]; ok {
		return text
	}
	return fmt.Sprintf("Чи стосується фільм теми «%s»?", name)
}

// dynamicFeatures builds one boolean feature per frequent-enough entity
// (keyword/actor/director), capped by document frequency rank.
func dynamicFeatures(
	movies []Movie,
	prefix string,
	refs func(Movie) []NamedRef,
	text func(name string) string,
	minDF, maxDF, cap int,
	robust bool,
) []Feature {
	type entity struct {
		ref NamedRef
		df  int
	}
	counts := make(map[int]*entity)
	for _, movie := range movies {
		seen := map[int]bool{}
		for _, ref := range refs(movie) {
			if ref.ID == 0 || ref.Name == "" || seen[ref.ID] {
				continue
			}
			seen[ref.ID] = true
			if e, ok := counts[ref.ID]; ok {
				e.df++
			} else {
				counts[ref.ID] = &entity{ref: ref, df: 1}
			}
		}
	}

	eligible := make([]*entity, 0, len(counts))
	for _, e := range counts {
		if e.df >= minDF && e.df <= maxDF {
			eligible = append(eligible, e)
		}
	}
	sort.Slice(eligible, func(i, j int) bool {
		if eligible[i].df != eligible[j].df {
			return eligible[i].df > eligible[j].df
		}
		return eligible[i].ref.ID < eligible[j].ref.ID
	})
	if len(eligible) > cap {
		eligible = eligible[:cap]
	}

	features := make([]Feature, 0, len(eligible))
	for _, e := range eligible {
		bitmap := make([]bool, len(movies))
		for i, movie := range movies {
			for _, ref := range refs(movie) {
				if ref.ID == e.ref.ID {
					bitmap[i] = true
					break
				}
			}
		}
		features = append(features, Feature{
			ID:     fmt.Sprintf("%s_%d", prefix, e.ref.ID),
			Text:   text(e.ref.Name),
			Has:    bitmap,
			Robust: robust,
		})
	}
	return features
}
