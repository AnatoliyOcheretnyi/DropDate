package moodpicker

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

// Question is a single step of the guided flow.
type Question struct {
	ID      string   `json:"id"`
	Title   string   `json:"title"`
	Type    string   `json:"type"` // always "single" in v1
	Options []Option `json:"options"`
}

// QuestionSet is the schema payload returned by GET /mood/questions.
type QuestionSet struct {
	Items []Question   `json:"items"`
	Meta  QuestionMeta `json:"meta"`
}

// QuestionMeta describes the served schema.
type QuestionMeta struct {
	Depth   string `json:"depth"`
	Version int    `json:"version"`
}

// NextRequest is the input for POST /mood/next: the depth and the answers
// gathered so far. The server decides the next question adaptively.
type NextRequest struct {
	Depth   string            `json:"depth"`
	Answers map[string]string `json:"answers"`

	// UserID is set server-side; used only to gate AI branching by capability.
	UserID string `json:"-"`
}

// NextResult is the response for POST /mood/next.
type NextResult struct {
	Question *Question    `json:"question,omitempty"`
	Done     bool         `json:"done"`
	Answered int          `json:"answered"`
	Meta     QuestionMeta `json:"meta"`
}

// AnsweredQuestion is one prior answer with human labels, given to the AI
// strategy as context for choosing the next question.
type AnsweredQuestion struct {
	QuestionID    string `json:"questionId"`
	QuestionTitle string `json:"questionTitle"`
	OptionID      string `json:"optionId"`
	OptionLabel   string `json:"optionLabel"`
}

// NextQuestionStrategy picks the next question id from a candidate set given the
// answers so far. Implemented by an AI adapter. It must return an id present in
// `candidates` (grounded), or "" to defer to the rule-based order.
type NextQuestionStrategy interface {
	NextQuestionID(ctx context.Context, answered []AnsweredQuestion, candidates []Question) (string, error)
}

// PicksRequest is the resolved input for POST /mood/picks.
type PicksRequest struct {
	Mode           string            `json:"mode"`
	Depth          string            `json:"depth"`
	Answers        map[string]string `json:"answers"`
	Nudges         []string          `json:"nudges"`
	Count          int               `json:"count"`
	ExcludeTMDBIDs []int             `json:"excludeTmdbIds"`

	// UserID is set server-side from the authenticated session, never from the body.
	UserID string `json:"-"`
}

// Pick is one recommended movie returned to the client.
type Pick struct {
	TMDBID    int     `json:"tmdbId"`
	MediaType string  `json:"mediaType"`
	Title     string  `json:"title"`
	Year      string  `json:"year,omitempty"`
	PosterURL string  `json:"posterUrl,omitempty"`
	Rating    float64 `json:"rating,omitempty"`
	Reason    string  `json:"reason,omitempty"`
}

// PicksMeta describes a generation run.
type PicksMeta struct {
	Count       int       `json:"count"`
	Relaxed     []string  `json:"relaxed"`
	GeneratedAt time.Time `json:"generatedAt"`
}

// PicksResult is the full payload returned to the client.
type PicksResult struct {
	Items []Pick    `json:"items"`
	Meta  PicksMeta `json:"meta"`
}
