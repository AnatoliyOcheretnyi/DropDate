package recommendations

import (
	"context"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/saved"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/taste"
)

// savedReader exposes the user's saved rows used to derive seeds and exclusions.
// saved.Service satisfies this interface.
type savedReader interface {
	SeedRows(ctx context.Context, userID string) ([]saved.Title, error)
}

// candidateReader fetches TMDB title-to-title recommendations for a seed.
// release.Service satisfies this interface.
type candidateReader interface {
	Recommendations(ctx context.Context, id int, mediaType string, limit int) ([]release.Suggestion, error)
}
type tasteReader interface {
	Rankings(ctx context.Context, userID, kind string) ([]taste.Item, error)
}
type discoverReader interface {
	Discover(ctx context.Context, p release.DiscoverParams) ([]release.DiscoverItem, error)
}

// Item is a single ranked recommendation returned to the client.
type Item struct {
	TMDBID    int    `json:"tmdbId"`
	MediaType string `json:"mediaType"`
	Title     string `json:"title"`
	Year      string `json:"year,omitempty"`
	PosterURL string `json:"posterUrl,omitempty"`
	Reason    Reason `json:"reason"`
}

// Reason carries debug/analytics context about why an item was recommended.
type Reason struct {
	SeedCount     int    `json:"seedCount"`
	PrimarySource string `json:"primarySource"`
	// Text is an optional AI-written, human-readable explanation of why the
	// title was recommended. Populated only for AI-enhanced responses.
	Text string `json:"text,omitempty"`
}

// Meta describes the generation run.
type Meta struct {
	SeedCount   int       `json:"seedCount"`
	GeneratedAt time.Time `json:"generatedAt"`
}

// Result is the full recommendations payload.
type Result struct {
	Items []Item `json:"items"`
	Meta  Meta   `json:"meta"`
}

// DailyResult is one stable personalized pick for a UTC calendar day.
type DailyResult struct {
	Date string `json:"date"`
	Pick *Item  `json:"pick,omitempty"`
}

// seed is a single saved title selected as a recommendation source.
type seed struct {
	tmdbID    int
	mediaType string
	// weight may be negative: such seeds pull matching candidates down
	// instead of promoting them (disliked titles, low user ratings).
	weight int
	source string
	recent bool
	// title of the seed itself, used to write a human-readable reason
	// ("Схоже на «…»") for the candidates it produces.
	title string
}

func (s seed) key() string {
	return candidateKey(s.tmdbID, s.mediaType)
}
