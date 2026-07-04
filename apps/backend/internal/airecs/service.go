// Package airecs adds a Gemini-backed re-ranking layer on top of the
// deterministic recommendation engine. The model never invents titles: it only
// selects and orders items from a candidate pool of real TMDB titles supplied
// by the caller, and every returned id is validated back against that pool.
package airecs

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"

	"google.golang.org/genai"
)

const (
	// DefaultModel is a current, fast Gemini model well suited to a short
	// selection task. Override via GEMINI_MODEL.
	DefaultModel = "gemini-2.5-flash"

	maxOutputTokens  = 2048
	maxPromptSignals = 24
	maxPromptPool    = 60
)

// ErrUnavailable is returned when the service is not configured (no API key).
var ErrUnavailable = errors.New("ai recommendations unavailable")

// ModelOrDefault returns the configured model, or DefaultModel when empty.
func ModelOrDefault(model string) string {
	if strings.TrimSpace(model) == "" {
		return DefaultModel
	}
	return model
}

// Candidate is one real TMDB title the model may pick from.
type Candidate struct {
	TMDBID    int    `json:"tmdbId"`
	MediaType string `json:"mediaType"`
	Title     string `json:"title"`
	Year      string `json:"year,omitempty"`
}

// TasteSignal is one data point about the user's taste, derived from their
// saved lists.
type TasteSignal struct {
	Title     string `json:"title"`
	MediaType string `json:"mediaType"`
	Sentiment string `json:"sentiment"` // favorite | loved | watchlist | disliked
	Rating    int    `json:"rating,omitempty"`
}

// Selection is one ranked pick returned by the model, with its reason.
type Selection struct {
	TMDBID    int    `json:"tmdbId"`
	MediaType string `json:"mediaType"`
	Reason    string `json:"reason"`
}

// Service wraps the Gemini client.
type Service struct {
	client *genai.Client
	model  string
	logger *log.Logger
}

// NewService builds a Gemini-backed service. Returns ErrUnavailable when no API
// key is configured so callers can degrade gracefully.
func NewService(ctx context.Context, apiKey, model string, logger *log.Logger) (*Service, error) {
	if strings.TrimSpace(apiKey) == "" {
		return nil, ErrUnavailable
	}
	if logger == nil {
		logger = log.Default()
	}
	if strings.TrimSpace(model) == "" {
		model = DefaultModel
	}
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return nil, fmt.Errorf("create gemini client: %w", err)
	}
	return &Service{client: client, model: model, logger: logger}, nil
}

// Rerank asks the model to select and order up to `limit` items from `pool`
// based on the user's taste, writing a short reason for each. Returned ids are
// validated against the pool; anything the model invents is dropped.
func (s *Service) Rerank(ctx context.Context, profile []TasteSignal, pool []Candidate, limit int) ([]Selection, error) {
	if len(pool) == 0 {
		return nil, nil
	}
	if limit <= 0 {
		limit = len(pool)
	}
	if len(profile) > maxPromptSignals {
		profile = profile[:maxPromptSignals]
	}
	if len(pool) > maxPromptPool {
		pool = pool[:maxPromptPool]
	}

	userPrompt, err := buildPrompt(profile, pool, limit)
	if err != nil {
		return nil, err
	}

	temperature := float32(0.4)
	cfg := &genai.GenerateContentConfig{
		SystemInstruction: genai.NewContentFromText(systemPrompt, genai.RoleUser),
		ResponseMIMEType:  "application/json",
		ResponseSchema:    responseSchema(),
		MaxOutputTokens:   maxOutputTokens,
		Temperature:       &temperature,
	}

	resp, err := s.client.Models.GenerateContent(ctx, s.model, genai.Text(userPrompt), cfg)
	if err != nil {
		return nil, fmt.Errorf("gemini generate: %w", err)
	}
	raw := strings.TrimSpace(resp.Text())
	if raw == "" {
		return nil, errors.New("gemini returned empty response")
	}

	var parsed struct {
		Items []Selection `json:"items"`
	}
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		return nil, fmt.Errorf("parse gemini response: %w", err)
	}

	return validate(parsed.Items, pool, limit), nil
}

// validate keeps only selections whose (tmdbId, mediaType) exist in the pool,
// drops duplicates, and truncates to limit. This makes hallucinated titles
// impossible in the output.
func validate(items []Selection, pool []Candidate, limit int) []Selection {
	allowed := make(map[string]bool, len(pool))
	for _, c := range pool {
		allowed[key(c.TMDBID, c.MediaType)] = true
	}
	seen := make(map[string]bool, len(items))
	out := make([]Selection, 0, limit)
	for _, item := range items {
		k := key(item.TMDBID, item.MediaType)
		if !allowed[k] || seen[k] {
			continue
		}
		seen[k] = true
		out = append(out, Selection{
			TMDBID:    item.TMDBID,
			MediaType: item.MediaType,
			Reason:    strings.TrimSpace(item.Reason),
		})
		if len(out) >= limit {
			break
		}
	}
	return out
}

func key(id int, mediaType string) string {
	return fmt.Sprintf("%s:%d", strings.ToLower(strings.TrimSpace(mediaType)), id)
}

const systemPrompt = `Ти — кураторка кіно- та серіальних рекомендацій для застосунку DropDate.
Тобі дають профіль смаку користувача та пул реальних тайтлів-кандидатів.
Правила:
- Обирай тайтли ВИКЛЮЧНО з наданого пулу, за їхнім tmdbId та mediaType. Нічого не вигадуй.
- Впорядкуй вибір від найбільш до найменш релевантного для цього користувача.
- Для кожного тайтла напиши reason — одне живе речення українською (макс. 140 символів),
  яке пояснює, чому саме цей тайтл підійде користувачу, спираючись на його смак.
- Не повторюй тайтли. Поверни рівно стільки, скільки просить limit (або менше, якщо пул малий).`

func buildPrompt(profile []TasteSignal, pool []Candidate, limit int) (string, error) {
	payload := struct {
		Limit   int           `json:"limit"`
		Profile []TasteSignal `json:"profile"`
		Pool    []Candidate   `json:"pool"`
	}{Limit: limit, Profile: profile, Pool: pool}
	encoded, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("encode prompt: %w", err)
	}
	return "Ось профіль смаку та пул кандидатів. Обери й впорядкуй найкращі варіанти:\n" + string(encoded), nil
}

func responseSchema() *genai.Schema {
	return &genai.Schema{
		Type: genai.TypeObject,
		Properties: map[string]*genai.Schema{
			"items": {
				Type: genai.TypeArray,
				Items: &genai.Schema{
					Type: genai.TypeObject,
					Properties: map[string]*genai.Schema{
						"tmdbId":    {Type: genai.TypeInteger},
						"mediaType": {Type: genai.TypeString},
						"reason":    {Type: genai.TypeString},
					},
					Required: []string{"tmdbId", "mediaType", "reason"},
				},
			},
		},
		Required: []string{"items"},
	}
}
