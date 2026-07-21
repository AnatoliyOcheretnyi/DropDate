package games

import (
	"context"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
)

// Mode identifies a game variant.
type Mode string

const (
	// Pair comparison modes (left vs right).
	ModeReleaseDate Mode = "release_date"
	ModeRating      Mode = "rating"
	// ModePoster is a multiple-choice round: a backdrop still plus four title
	// options, one correct.
	ModePoster Mode = "poster"
	// ModeTimeline asks the player to order several titles by release date.
	ModeTimeline Mode = "timeline"
	// ModeYear asks the player to guess a single title's release year.
	ModeYear          Mode = "year"
	ModeMovieDirector Mode = "movie_director"
	ModeDirectorMovie Mode = "director_movie"
	ModeMovieActor    Mode = "movie_actor"
	ModeActorMovie    Mode = "actor_movie"
)

// catalogSource exposes the TMDB-backed catalog used to build candidate pools
// and to enrich titles with comparison metrics. release.Service satisfies it.
type catalogSource interface {
	Popular(ctx context.Context, mediaType string, limit int) ([]release.Suggestion, error)
	TopRated(ctx context.Context, mediaType string, limit int) ([]release.Suggestion, error)
	TrendingByType(ctx context.Context, mediaType string, window string, limit int) ([]release.Suggestion, error)
	Details(ctx context.Context, id int, mediaType string) (release.Details, error)
}

// TitleCard is one playable title in a question.
type TitleCard struct {
	TMDBID      int     `json:"tmdbId"`
	MediaType   string  `json:"mediaType"`
	Title       string  `json:"title"`
	Year        string  `json:"year,omitempty"`
	PosterURL   string  `json:"posterUrl,omitempty"`
	BackdropURL string  `json:"backdropUrl,omitempty"`
	ReleaseDate string  `json:"releaseDate,omitempty"`
	Rating      float64 `json:"rating,omitempty"`
}

type PersonCard struct {
	TMDBID     int    `json:"tmdbId"`
	Name       string `json:"name"`
	ProfileURL string `json:"profileUrl,omitempty"`
	Role       string `json:"role,omitempty"`
}

// Question is a single round. Pair modes fill Left/Right/Answer ("left" or
// "right"); poster fills Card/Options/AnswerID; timeline fills Items (shuffled,
// each carrying its release date for the reveal); year fills Card only. The
// correct answer always ships with the question so the client can reveal
// results without a round trip.
type Question struct {
	ID     string     `json:"id"`
	Mode   Mode       `json:"mode"`
	Prompt string     `json:"prompt"`
	Left   *TitleCard `json:"left,omitempty"`
	Right  *TitleCard `json:"right,omitempty"`
	Answer string     `json:"answer,omitempty"`

	// Card is the subject title for poster/year rounds.
	Card *TitleCard `json:"card,omitempty"`
	// Options are the poster-round choices (correct one included, shuffled).
	Options []TitleCard `json:"options,omitempty"`
	// AnswerID is the tmdbId of the correct poster-round option.
	AnswerID int `json:"answerId,omitempty"`
	// Items are the timeline-round titles in shuffled order.
	Items  []TitleCard  `json:"items,omitempty"`
	Person *PersonCard  `json:"person,omitempty"`
	People []PersonCard `json:"people,omitempty"`
}

// Meta describes a generated question set.
type Meta struct {
	Mode        Mode      `json:"mode"`
	Count       int       `json:"count"`
	GeneratedAt time.Time `json:"generatedAt"`
}

// Questions is the full payload returned to the client.
type Questions struct {
	Items []Question `json:"items"`
	Meta  Meta       `json:"meta"`
}

// candidate is an enriched pool entry used during generation. It carries the
// presentation-ready card plus the parsed release date used for validity checks.
type candidate struct {
	card        TitleCard
	releaseDate time.Time
	hasDate     bool
	cast        []release.CastMember
	directors   []release.CrewMember
}
