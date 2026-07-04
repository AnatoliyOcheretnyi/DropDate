package airecs

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/moodpicker"
	"google.golang.org/genai"
)

// NextQuestionID implements moodpicker.NextQuestionStrategy: given the answers
// so far, it asks Gemini to pick the most natural next question — grounded to
// the provided candidate ids, so it can never invent a question. Returning ""
// (or an error) makes the caller fall back to the rule-based order.
func (s *Service) NextQuestionID(
	ctx context.Context,
	answered []moodpicker.AnsweredQuestion,
	candidates []moodpicker.Question,
) (string, error) {
	if len(candidates) == 0 {
		return "", nil
	}
	if len(candidates) == 1 {
		return candidates[0].ID, nil
	}

	prompt, err := buildMoodPrompt(answered, candidates)
	if err != nil {
		return "", err
	}

	noThinking := int32(0)
	cfg := &genai.GenerateContentConfig{
		SystemInstruction: genai.NewContentFromText(moodSystemPrompt, genai.RoleUser),
		ResponseMIMEType:  "application/json",
		ResponseSchema: &genai.Schema{
			Type: genai.TypeObject,
			Properties: map[string]*genai.Schema{
				"questionId": {Type: genai.TypeString},
			},
			Required: []string{"questionId"},
		},
		MaxOutputTokens: 128,
		ThinkingConfig:  &genai.ThinkingConfig{ThinkingBudget: &noThinking},
	}

	resp, err := s.client.Models.GenerateContent(ctx, s.model, genai.Text(prompt), cfg)
	if err != nil {
		return "", fmt.Errorf("gemini next-question: %w", err)
	}
	raw := strings.TrimSpace(resp.Text())
	if raw == "" {
		return "", errors.New("gemini returned empty next-question")
	}
	var parsed struct {
		QuestionID string `json:"questionId"`
	}
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		return "", fmt.Errorf("parse next-question: %w", err)
	}
	return strings.TrimSpace(parsed.QuestionID), nil
}

const moodSystemPrompt = `Ти ведеш коротке гнучке опитування про настрій для добірки фільмів.
На основі попередніх відповідей користувача обери НАСТУПНЕ питання, яке
найприродніше уточнить його смак прямо зараз.
Правила:
- Обери id ВИКЛЮЧНО з наданого списку кандидатів. Нічого не вигадуй.
- Віддавай перевагу питанню, що найбільше додає нової інформації з огляду на вже
  дані відповіді (не питай очевидне повторно).
- Поверни лише questionId.`

func buildMoodPrompt(answered []moodpicker.AnsweredQuestion, candidates []moodpicker.Question) (string, error) {
	type candidateView struct {
		ID      string   `json:"id"`
		Title   string   `json:"title"`
		Options []string `json:"options"`
	}
	views := make([]candidateView, 0, len(candidates))
	for _, q := range candidates {
		labels := make([]string, 0, len(q.Options))
		for _, opt := range q.Options {
			labels = append(labels, opt.Label)
		}
		views = append(views, candidateView{ID: q.ID, Title: q.Title, Options: labels})
	}
	payload := struct {
		Answered   []moodpicker.AnsweredQuestion `json:"answered"`
		Candidates []candidateView               `json:"candidates"`
	}{Answered: answered, Candidates: views}
	encoded, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("encode mood prompt: %w", err)
	}
	return "Відповіді та кандидати на наступне питання:\n" + string(encoded), nil
}
