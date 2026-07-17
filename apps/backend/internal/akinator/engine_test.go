package akinator

import (
	"testing"
	"time"
)

func testMovies() []Movie {
	return []Movie{
		{TMDBID: 1, Title: "Animated Future", Year: 2024, Popularity: 90, VoteCount: 10000, VoteAverage: 8.1, Runtime: 95, OriginalLanguage: "en", GenreIDs: []int{16, 878}, OriginCountries: []string{"US"}},
		{TMDBID: 2, Title: "Old Crime", Year: 1972, Popularity: 70, VoteCount: 9000, VoteAverage: 8.5, Runtime: 175, OriginalLanguage: "en", IsFranchise: true, GenreIDs: []int{80, 18}, OriginCountries: []string{"US"}},
		{TMDBID: 3, Title: "French Romance", Year: 2001, Popularity: 45, VoteCount: 3000, VoteAverage: 7.3, Runtime: 110, OriginalLanguage: "fr", GenreIDs: []int{10749, 35}, OriginCountries: []string{"FR"}},
		{TMDBID: 4, Title: "Asian Horror", Year: 1998, Popularity: 35, VoteCount: 2500, VoteAverage: 7.0, Runtime: 100, OriginalLanguage: "ja", GenreIDs: []int{27, 9648}, OriginCountries: []string{"JP"}},
	}
}

func TestEngineConvergesOnConsistentAnswers(t *testing.T) {
	engine := NewEngine(testMovies(), time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC))
	history := []AnsweredQuestion{}
	for i := 0; i < maxQuestions; i++ {
		step, err := engine.Next(history)
		if err != nil {
			t.Fatal(err)
		}
		if step.Guess != nil {
			if step.Guess.TMDBID != 3 {
				t.Fatalf("guessed %d, want 3", step.Guess.TMDBID)
			}
			return
		}
		if step.Question == nil {
			t.Fatalf("gave up after %d answers", len(history))
		}
		fi := engine.byID[step.Question.ID]
		history = append(history, AnsweredQuestion{QuestionID: step.Question.ID, Answer: map[bool]Answer{true: AnswerYes, false: AnswerNo}[engine.features[fi].Has[2]]})
	}
	t.Fatal("did not produce a guess")
}

func TestUnknownAnswerIsNeutralAndContradictionKeepsCandidates(t *testing.T) {
	engine := NewEngine(testMovies(), time.Now())
	first, err := engine.Next(nil)
	if err != nil {
		t.Fatal(err)
	}
	unknown, err := engine.Next([]AnsweredQuestion{{QuestionID: first.Question.ID, Answer: AnswerUnknown}})
	if err != nil {
		t.Fatal(err)
	}
	if unknown.Type == "give_up" || unknown.Candidates == 0 {
		t.Fatal("unknown answer eliminated candidates")
	}
	contradiction, err := engine.Next([]AnsweredQuestion{{QuestionID: first.Question.ID, Answer: AnswerNo}})
	if err != nil {
		t.Fatal(err)
	}
	if contradiction.Type == "give_up" || contradiction.Candidates == 0 {
		t.Fatal("contradiction zeroed the distribution")
	}
}

func TestEngineRejectsUnknownAndDuplicateQuestions(t *testing.T) {
	engine := NewEngine(testMovies(), time.Now())
	if _, err := engine.Next([]AnsweredQuestion{{QuestionID: "missing", Answer: AnswerYes}}); err != ErrInvalidHistory {
		t.Fatalf("got %v", err)
	}
	first, _ := engine.Next(nil)
	history := []AnsweredQuestion{{QuestionID: first.Question.ID, Answer: AnswerYes}, {QuestionID: first.Question.ID, Answer: AnswerNo}}
	if _, err := engine.Next(history); err != ErrInvalidHistory {
		t.Fatalf("got %v", err)
	}
}
