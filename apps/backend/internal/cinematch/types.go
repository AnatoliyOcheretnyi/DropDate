package cinematch

import (
	"context"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/saved"
)

// catalogSource runs TMDB /discover queries. release.Service satisfies it.
type catalogSource interface {
	Discover(ctx context.Context, p release.DiscoverParams) ([]release.DiscoverItem, error)
}

// savedReader exposes a user's saved rows so we can exclude already-known
// titles. saved.Service satisfies it.
type savedReader interface {
	SeedRows(ctx context.Context, userID string) ([]saved.Title, error)
}

// Option is one selectable answer for a question.
type Option struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Emoji string `json:"emoji,omitempty"`
}

// Question is one narrowing step. AppliesTo is "both", "movie", or "tv" so the
// client can skip type-irrelevant questions once the media type is chosen.
type Question struct {
	ID        string   `json:"id"`
	Title     string   `json:"title"`
	Type      string   `json:"type"`
	AppliesTo string   `json:"appliesTo"`
	Options   []Option `json:"options"`
}

// QuestionSet is the (randomized) question flow served to the client.
type QuestionSet struct {
	Items []Question `json:"items"`
	Meta  struct {
		Version int `json:"version"`
	} `json:"meta"`
}

// PicksRequest is the input for POST /match/picks. The client accumulates
// answers across rounds and echoes them, plus the keys it has already shown.
type PicksRequest struct {
	Answers     map[string]string `json:"answers"`
	Count       int               `json:"count"`
	ExcludeKeys []string          `json:"excludeKeys"` // "movie:123", "tv:45"

	UserID string `json:"-"`
}

// Pick is one mixed-media recommendation.
type Pick struct {
	TMDBID    int     `json:"tmdbId"`
	MediaType string  `json:"mediaType"`
	Title     string  `json:"title"`
	Year      string  `json:"year,omitempty"`
	PosterURL string  `json:"posterUrl,omitempty"`
	Rating    float64 `json:"rating,omitempty"`
	Reason    string  `json:"reason,omitempty"`
}

// PicksResult is the payload returned to the client.
type PicksResult struct {
	Items []Pick `json:"items"`
	Meta  struct {
		Count       int       `json:"count"`
		GeneratedAt time.Time `json:"generatedAt"`
	} `json:"meta"`
}
