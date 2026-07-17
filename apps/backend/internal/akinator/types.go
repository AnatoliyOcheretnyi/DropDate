package akinator

// Movie is one dataset row: everything the engine needs to derive features
// plus the display fields for the guess card.
type Movie struct {
	TMDBID           int        `json:"tmdbId"`
	Title            string     `json:"title"`
	Year             int        `json:"year"`
	PosterURL        string     `json:"posterUrl"`
	BackdropURL      string     `json:"backdropUrl"`
	Popularity       float64    `json:"popularity"`
	VoteAverage      float64    `json:"voteAverage"`
	VoteCount        int        `json:"voteCount"`
	Runtime          int        `json:"runtime"`
	OriginalLanguage string     `json:"originalLanguage"`
	IsFranchise      bool       `json:"isFranchise"`
	OriginCountries  []string   `json:"originCountries"`
	GenreIDs         []int      `json:"genreIds"`
	Keywords         []NamedRef `json:"keywords"`
	Cast             []NamedRef `json:"cast"`
	Directors        []NamedRef `json:"directors"`
}

// NamedRef mirrors tmdb.NamedRef for JSON storage.
type NamedRef struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

// Answer is one of the five Akinator-style replies.
type Answer string

const (
	AnswerYes         Answer = "yes"
	AnswerProbably    Answer = "probably"
	AnswerUnknown     Answer = "unknown"
	AnswerProbablyNot Answer = "probably_not"
	AnswerNo          Answer = "no"
)

// KnownAnswer reports whether a wire value is a valid answer.
func KnownAnswer(value Answer) bool {
	switch value {
	case AnswerYes, AnswerProbably, AnswerUnknown, AnswerProbablyNot, AnswerNo:
		return true
	}
	return false
}

// Question is one feature phrased for the player.
type Question struct {
	ID   string `json:"id"`
	Text string `json:"text"`
}

// AnsweredQuestion is one history entry echoed by the client.
type AnsweredQuestion struct {
	QuestionID string `json:"questionId"`
	Answer     Answer `json:"answer"`
}

// Guess is the engine's candidate reveal.
type Guess struct {
	TMDBID      int     `json:"tmdbId"`
	MediaType   string  `json:"mediaType"`
	Title       string  `json:"title"`
	Year        int     `json:"year,omitempty"`
	PosterURL   string  `json:"posterUrl,omitempty"`
	BackdropURL string  `json:"backdropUrl,omitempty"`
	Confidence  float64 `json:"confidence"`
}

// StepResult is the response to /akinator/next: either the next question, a
// guess, or a concession.
type StepResult struct {
	Type string `json:"type"` // "question" | "guess" | "give_up"
	Step int    `json:"step"`
	// Candidates is how many titles are still plausible — pure drama fuel.
	Candidates int       `json:"candidates"`
	Question   *Question `json:"question,omitempty"`
	Guess      *Guess    `json:"guess,omitempty"`
}

type StartResult struct {
	SessionToken string   `json:"sessionToken"`
	Question     Question `json:"question"`
	Step         int      `json:"step"`
	Candidates   int      `json:"candidates"`
}

type ResultInput struct {
	SessionToken string             `json:"sessionToken"`
	GuessTMDBID  int                `json:"guessTmdbId"`
	Correct      bool               `json:"correct"`
	ActualTMDBID int                `json:"actualTmdbId,omitempty"`
	Answers      []AnsweredQuestion `json:"answers,omitempty"`
}
