package games

import (
	"context"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
)

// Mode identifies a comparison game variant.
type Mode string

const (
	ModeReleaseDate Mode = "release_date"
	ModeRating      Mode = "rating"
)

// catalogSource exposes the TMDB-backed catalog used to build candidate pools
// and to enrich titles with comparison metrics. release.Service satisfies it.
type catalogSource interface {
	Popular(ctx context.Context, mediaType string, limit int) ([]release.Suggestion, error)
	TopRated(ctx context.Context, mediaType string, limit int) ([]release.Suggestion, error)
	TrendingByType(ctx context.Context, mediaType string, window string, limit int) ([]release.Suggestion, error)
	Details(ctx context.Context, id int, mediaType string) (release.Details, error)
}

// TitleCard is one side of a comparison question.
type TitleCard struct {
	TMDBID      int     `json:"tmdbId"`
	MediaType   string  `json:"mediaType"`
	Title       string  `json:"title"`
	Year        string  `json:"year,omitempty"`
	PosterURL   string  `json:"posterUrl,omitempty"`
	ReleaseDate string  `json:"releaseDate,omitempty"`
	Rating      float64 `json:"rating,omitempty"`
}

// Question is a single comparison round. Answer holds the correct side
// ("left" or "right") so the client can reveal results without a round trip.
type Question struct {
	ID     string    `json:"id"`
	Mode   Mode      `json:"mode"`
	Prompt string    `json:"prompt"`
	Left   TitleCard `json:"left"`
	Right  TitleCard `json:"right"`
	Answer string    `json:"answer"`
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
}
