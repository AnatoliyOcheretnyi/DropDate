package cinematch

// Movie genre ids (TMDB).
const (
	mvAction    = 28
	mvAdventure = 12
	mvAnimation = 16
	mvComedy    = 35
	mvCrime     = 80
	mvDrama     = 18
	mvFamily    = 10751
	mvFantasy   = 14
	mvHorror    = 27
	mvMystery   = 9648
	mvRomance   = 10749
	mvSciFi     = 878
	mvThriller  = 53
	mvWar       = 10752
)

// TV genre ids (TMDB — these differ from movie genres).
const (
	tvActionAdv    = 10759
	tvAnimation    = 16
	tvComedy       = 35
	tvCrime        = 80
	tvDrama        = 18
	tvFamily       = 10751
	tvMystery      = 9648
	tvSciFiFantasy = 10765
)

// vibe maps a primary genre answer to genre ids per media type.
var vibeMovie = map[string][]int{
	"action":  {mvAction, mvAdventure},
	"drama":   {mvDrama},
	"comedy":  {mvComedy},
	"scary":   {mvHorror, mvThriller},
	"scifi":   {mvSciFi, mvFantasy},
	"romance": {mvRomance},
	"crime":   {mvCrime, mvMystery},
}

var vibeTV = map[string][]int{
	"action":  {tvActionAdv},
	"drama":   {tvDrama},
	"comedy":  {tvComedy},
	"scary":   {tvMystery, tvCrime},
	"scifi":   {tvSciFiFantasy},
	"romance": {tvDrama},
	"crime":   {tvCrime, tvMystery},
}

// noteMovie / noteTV map a secondary "flavour" answer to a genre id per media.
var noteMovie = map[string]int{
	"romance":  mvRomance,
	"comedy":   mvComedy,
	"thriller": mvThriller,
	"mystery":  mvMystery,
	"drama":    mvDrama,
}

var noteTV = map[string]int{
	"romance":  tvDrama,
	"comedy":   tvComedy,
	"thriller": tvMystery,
	"mystery":  tvMystery,
	"drama":    tvDrama,
}

func genresFor(media, vibe string) []int {
	if media == "tv" {
		return vibeTV[vibe]
	}
	return vibeMovie[vibe]
}

func noteGenre(media, note string) (int, bool) {
	if media == "tv" {
		id, ok := noteTV[note]
		return id, ok
	}
	id, ok := noteMovie[note]
	return id, ok
}

func animationGenre(media string) int {
	if media == "tv" {
		return tvAnimation
	}
	return mvAnimation
}

func comedyGenre(media string) int {
	if media == "tv" {
		return tvComedy
	}
	return mvComedy
}

func dramaGenre(media string) int {
	if media == "tv" {
		return tvDrama
	}
	return mvDrama
}

func familyGenre(media string) int {
	if media == "tv" {
		return tvFamily
	}
	return mvFamily
}
