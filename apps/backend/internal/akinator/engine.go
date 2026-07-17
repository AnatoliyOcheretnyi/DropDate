package akinator

import (
	"errors"
	"math"
	"sort"
	"time"
)

const (
	maxQuestions    = 20
	guessConfidence = 0.55
	guessLeadRatio  = 1.8
)

var ErrInvalidHistory = errors.New("invalid answer history")

type Engine struct {
	movies   []Movie
	features []Feature
	byID     map[string]int
}

func NewEngine(movies []Movie, now time.Time) *Engine {
	features := BuildFeatureSpace(movies, now)
	byID := make(map[string]int, len(features))
	for i, feature := range features {
		byID[feature.ID] = i
	}
	return &Engine{movies: append([]Movie(nil), movies...), features: features, byID: byID}
}

func (e *Engine) Start() (Question, bool) {
	result, err := e.Next(nil)
	return questionValue(result), err == nil && result.Question != nil
}

func questionValue(result StepResult) Question {
	if result.Question == nil {
		return Question{}
	}
	return *result.Question
}

func (e *Engine) Next(history []AnsweredQuestion) (StepResult, error) {
	if len(e.movies) == 0 || len(e.features) == 0 {
		return StepResult{Type: "give_up", Step: len(history) + 1}, nil
	}
	weights := make([]float64, len(e.movies))
	asked := make(map[string]bool, len(history))
	for i, movie := range e.movies {
		weights[i] = math.Max(1, math.Log1p(movie.Popularity)+math.Log1p(float64(movie.VoteCount))/3)
	}
	for _, item := range history {
		featureIndex, ok := e.byID[item.QuestionID]
		if !ok || !KnownAnswer(item.Answer) || asked[item.QuestionID] {
			return StepResult{}, ErrInvalidHistory
		}
		asked[item.QuestionID] = true
		feature := e.features[featureIndex]
		for i := range weights {
			weights[i] *= answerLikelihood(item.Answer, feature.Has[i])
		}
	}

	total, top, second := weightSummary(weights)
	if total <= 1e-12 {
		return StepResult{Type: "give_up", Step: len(history) + 1}, nil
	}
	confidence := weights[top] / total
	if len(history) >= maxQuestions || (len(history) >= 5 && confidence >= guessConfidence && (second < 0 || weights[top] >= weights[second]*guessLeadRatio)) {
		movie := e.movies[top]
		return StepResult{Type: "guess", Step: len(history) + 1, Candidates: plausibleCount(weights, total), Guess: &Guess{
			TMDBID: movie.TMDBID, MediaType: "movie", Title: movie.Title, Year: movie.Year,
			PosterURL: movie.PosterURL, BackdropURL: movie.BackdropURL, Confidence: math.Round(confidence*1000) / 1000,
		}}, nil
	}

	featureIndex := e.bestQuestion(weights, total, asked)
	if featureIndex < 0 {
		movie := e.movies[top]
		return StepResult{Type: "guess", Step: len(history) + 1, Candidates: plausibleCount(weights, total), Guess: &Guess{
			TMDBID: movie.TMDBID, MediaType: "movie", Title: movie.Title, Year: movie.Year,
			PosterURL: movie.PosterURL, BackdropURL: movie.BackdropURL, Confidence: math.Round(confidence*1000) / 1000,
		}}, nil
	}
	feature := e.features[featureIndex]
	return StepResult{Type: "question", Step: len(history) + 1, Candidates: plausibleCount(weights, total), Question: &Question{ID: feature.ID, Text: feature.Text}}, nil
}

func (e *Engine) bestQuestion(weights []float64, total float64, asked map[string]bool) int {
	best, bestScore := -1, -1.0
	for fi, feature := range e.features {
		if asked[feature.ID] {
			continue
		}
		trueWeight := 0.0
		for i, has := range feature.Has {
			if has {
				trueWeight += weights[i]
			}
		}
		p := trueWeight / total
		if p <= 0.01 || p >= 0.99 {
			continue
		}
		score := -p*math.Log2(p) - (1-p)*math.Log2(1-p)
		if !feature.Robust {
			score *= 0.94
		}
		if score > bestScore {
			best, bestScore = fi, score
		}
	}
	return best
}

func answerLikelihood(answer Answer, has bool) float64 {
	if answer == AnswerUnknown {
		return 1
	}
	positive := map[Answer]float64{AnswerYes: 0.92, AnswerProbably: 0.72, AnswerProbablyNot: 0.28, AnswerNo: 0.08}[answer]
	if has {
		return positive
	}
	return 1 - positive
}

func weightSummary(weights []float64) (float64, int, int) {
	total := 0.0
	indices := make([]int, len(weights))
	for i, weight := range weights {
		total += weight
		indices[i] = i
	}
	sort.Slice(indices, func(i, j int) bool { return weights[indices[i]] > weights[indices[j]] })
	top, second := -1, -1
	if len(indices) > 0 {
		top = indices[0]
	}
	if len(indices) > 1 {
		second = indices[1]
	}
	return total, top, second
}

func plausibleCount(weights []float64, total float64) int {
	count := 0
	for _, weight := range weights {
		if weight/total >= 0.001 {
			count++
		}
	}
	return count
}
