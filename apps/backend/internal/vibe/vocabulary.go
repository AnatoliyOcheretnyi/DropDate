// Package vibe turns a free-text phrase ("молодіжний жах де багато крові") into
// a /discover query.
//
// The model never writes the query: it only picks ids out of the vocabularies
// declared here and the theme catalog in internal/themes. Everything it returns
// is validated back against those lists, so a hallucinated genre or keyword
// cannot reach TMDB — the worst case is an empty plan, which falls back to the
// deterministic matcher.
package vibe

import "strings"

// Genre is one entry of the genre vocabulary offered to the model. Movie and TV
// carry different TMDB ids for the same idea, and some ideas (horror, thriller,
// romance) have no TV bucket at all.
type Genre struct {
	Slug    string `json:"slug"`
	Label   string `json:"label"`
	movieID int
	tvID    int // 0 = no TV equivalent
}

var genreCatalog = []Genre{
	{"action", "Бойовик", 28, 10759},
	{"comedy", "Комедія", 35, 35},
	{"drama", "Драма", 18, 18},
	{"scifi", "Фантастика", 878, 10765},
	{"horror", "Жахи", 27, 0},
	{"thriller", "Трилер", 53, 0},
	{"romance", "Романтика", 10749, 0},
	{"adventure", "Пригоди", 12, 10759},
	{"animation", "Анімація", 16, 16},
	{"fantasy", "Фентезі", 14, 10765},
	{"crime", "Детектив", 80, 80},
	{"docs", "Документальні", 99, 99},
	{"family", "Сімейне", 10751, 10751},
	{"history", "Історичне", 36, 0},
	{"music", "Музика", 10402, 0},
	{"mystery", "Містика й таємниці", 9648, 9648},
	{"war", "Війна", 10752, 10768},
	{"western", "Вестерн", 37, 37},
}

// Genres returns the genre vocabulary in catalog order.
func Genres() []Genre {
	out := make([]Genre, len(genreCatalog))
	copy(out, genreCatalog)
	return out
}

func genreBySlug(slug string) (Genre, bool) {
	slug = strings.ToLower(strings.TrimSpace(slug))
	for _, genre := range genreCatalog {
		if genre.Slug == slug {
			return genre, true
		}
	}
	return Genre{}, false
}

// Country is one entry of the country vocabulary.
type Country struct {
	Code  string `json:"code"`
	Label string `json:"label"`
}

var countryCatalog = []Country{
	{"US", "США"}, {"GB", "Британія"}, {"KR", "Корея"}, {"JP", "Японія"},
	{"UA", "Україна"}, {"FR", "Франція"}, {"ES", "Іспанія"}, {"IN", "Індія"},
	{"DE", "Німеччина"}, {"IT", "Італія"}, {"PL", "Польща"}, {"SE", "Швеція"},
	{"DK", "Данія"}, {"NO", "Норвегія"}, {"CA", "Канада"}, {"AU", "Австралія"},
	{"CN", "Китай"}, {"TW", "Тайвань"}, {"HK", "Гонконг"}, {"TH", "Таїланд"},
	{"TR", "Туреччина"}, {"BR", "Бразилія"}, {"MX", "Мексика"}, {"AR", "Аргентина"},
}

// Countries returns the country vocabulary in catalog order.
func Countries() []Country {
	out := make([]Country, len(countryCatalog))
	copy(out, countryCatalog)
	return out
}

func countryByCode(code string) (Country, bool) {
	code = strings.ToUpper(strings.TrimSpace(code))
	for _, country := range countryCatalog {
		if country.Code == code {
			return country, true
		}
	}
	return Country{}, false
}

// MediaTypes the plan may ask for.
const (
	MediaMovie = "movie"
	MediaTV    = "tv"
)
