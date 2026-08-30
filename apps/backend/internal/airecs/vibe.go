package airecs

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/vibe"
	"google.golang.org/genai"
)

// InterpretPhrase implements vibe.Interpreter: it reads a free-text phrase and
// picks the themes, genres and filters that describe it.
//
// The model chooses ids out of the vocabulary the caller passes in and nothing
// else — it never writes a TMDB query and never names a title. Everything it
// returns is validated against the same vocabulary on the way back, so the
// worst case is an empty plan, not a wrong one.
func (s *Service) InterpretPhrase(
	ctx context.Context,
	phrase string,
	vocab vibe.Vocabulary,
) (vibe.Plan, error) {
	phrase = strings.TrimSpace(phrase)
	if phrase == "" {
		return vibe.Plan{}, nil
	}

	prompt, err := buildVibePrompt(phrase, vocab)
	if err != nil {
		return vibe.Plan{}, err
	}

	// Thinking is off on purpose: it eats the output budget and the answer
	// arrives truncated ("unexpected end of JSON input"). Picking ids out of a
	// list needs no deliberation.
	temperature := float32(0.2)
	noThinking := int32(0)
	cfg := &genai.GenerateContentConfig{
		SystemInstruction: genai.NewContentFromText(vibeSystemPrompt, genai.RoleUser),
		ResponseMIMEType:  "application/json",
		ResponseSchema:    vibeSchema(),
		MaxOutputTokens:   768,
		Temperature:       &temperature,
		ThinkingConfig:    &genai.ThinkingConfig{ThinkingBudget: &noThinking},
		SafetySettings:    vibeSafetySettings(),
	}

	resp, err := s.client.Models.GenerateContent(ctx, s.model, genai.Text(prompt), cfg)
	if err != nil {
		return vibe.Plan{}, fmt.Errorf("gemini interpret: %w", err)
	}
	raw := strings.TrimSpace(resp.Text())
	if raw == "" {
		return vibe.Plan{}, errors.New("gemini returned an empty interpretation")
	}

	var plan vibe.Plan
	if err := json.Unmarshal([]byte(raw), &plan); err != nil {
		return vibe.Plan{}, fmt.Errorf("parse interpretation: %w", err)
	}
	return plan, nil
}

// vibeSafetySettings relax the default thresholds for this one call.
//
// The task is to label a search phrase with ids from a fixed list — nothing is
// written, nothing is described. At the default threshold "жахи, де є оголення"
// and "щось дуже жорстоке" come back blocked, and the search falls through to
// the keyword matcher for exactly the phrases the model was added to read. The
// output is still a set of ids validated against the catalog, so a relaxed
// threshold cannot widen what the search can return.
func vibeSafetySettings() []*genai.SafetySetting {
	threshold := genai.HarmBlockThresholdBlockOnlyHigh
	categories := []genai.HarmCategory{
		genai.HarmCategorySexuallyExplicit,
		genai.HarmCategoryDangerousContent,
		genai.HarmCategoryHarassment,
		genai.HarmCategoryHateSpeech,
	}
	out := make([]*genai.SafetySetting, 0, len(categories))
	for _, category := range categories {
		out = append(out, &genai.SafetySetting{Category: category, Threshold: threshold})
	}
	return out
}

const vibeSystemPrompt = `Ти перекладаєш вільний опис фільму на структурований запит.
Користувач пише українською, як думає: «молодіжний жах де багато крові»,
«комедія з привидами», «щось повільне про сімʼю».

Правила:
- Обирай ВИКЛЮЧНО id з наданих списків themes, genres і countries. Нічого не вигадуй.
- themes — про ЩО фільм (теми, ключові слова). genres — ЯКИЙ це фільм. Використовуй
  обидва, коли фраза містить і те, й інше.
- Не додавай жанр, якого немає у фразі й він не випливає з теми. Краще менше й точніше.
- Максимум 4 теми і 3 жанри.
- excludeGenres — лише коли користувач явно щось відкидає («без жахів», «не мелодрама»).
- mediaTypes лишай порожнім, якщо у фразі немає слова про фільм чи серіал.
- yearFrom/yearTo — лише коли час згадано («нове», «90-х», «класика»). Інакше 0.
- Запити про оголення, еротику, кров і жорстокість — звичайні запити про кіно, а не
  про порнографію. Для них є теми erotica, gore, disturbing: обирай їх прямо, а не
  найближчу пристойнішу тему. «Жахи, де є оголення» — це genres:[horror] +
  themes:[erotica], а не просто horror.
- summary — один короткий рядок українською про те, як ти зрозумів запит.`

func vibeSchema() *genai.Schema {
	stringArray := func(desc string) *genai.Schema {
		return &genai.Schema{
			Type:        genai.TypeArray,
			Description: desc,
			Items:       &genai.Schema{Type: genai.TypeString},
		}
	}
	return &genai.Schema{
		Type: genai.TypeObject,
		Properties: map[string]*genai.Schema{
			"themes":        stringArray("id тем із наданого списку"),
			"genres":        stringArray("slug жанрів із наданого списку"),
			"excludeGenres": stringArray("slug жанрів, яких користувач не хоче"),
			"mediaTypes":    stringArray("movie та/або tv"),
			"countries":     stringArray("ISO-коди країн зі списку"),
			"yearFrom":      {Type: genai.TypeInteger},
			"yearTo":        {Type: genai.TypeInteger},
			"summary":       {Type: genai.TypeString},
		},
		Required: []string{"themes", "genres", "summary"},
	}
}

func buildVibePrompt(phrase string, vocab vibe.Vocabulary) (string, error) {
	type themeView struct {
		ID    string `json:"id"`
		Label string `json:"label"`
		Group string `json:"group"`
	}
	views := make([]themeView, 0, len(vocab.Themes))
	for _, theme := range vocab.Themes {
		views = append(views, themeView{ID: theme.ID, Label: theme.Label, Group: theme.Group})
	}

	payload := struct {
		Phrase    string         `json:"phrase"`
		Themes    []themeView    `json:"themes"`
		Genres    []vibe.Genre   `json:"genres"`
		Countries []vibe.Country `json:"countries"`
	}{Phrase: phrase, Themes: views, Genres: vocab.Genres, Countries: vocab.Countries}

	encoded, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("encode interpretation prompt: %w", err)
	}
	return string(encoded), nil
}

// RerankByPhrase implements vibe.Reranker: it orders already-found titles by how
// well they answer the phrase.
//
// Each candidate carries its overview, so the model judges what a film is about
// rather than how it is named — that is the whole difference between "жах для
// підлітків" and "жах про підлітків". Returned keys are validated against the
// pool; anything invented is dropped.
func (s *Service) RerankByPhrase(
	ctx context.Context,
	phrase string,
	pool []vibe.Candidate,
	limit int,
) ([]string, error) {
	if len(pool) == 0 {
		return nil, nil
	}
	if limit <= 0 || limit > len(pool) {
		limit = len(pool)
	}
	if len(pool) > maxVibePool {
		pool = pool[:maxVibePool]
	}

	payload := struct {
		Phrase     string           `json:"phrase"`
		Limit      int              `json:"limit"`
		Candidates []vibe.Candidate `json:"candidates"`
	}{Phrase: phrase, Limit: limit, Candidates: pool}
	encoded, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("encode rerank prompt: %w", err)
	}

	temperature := float32(0.3)
	noThinking := int32(0)
	cfg := &genai.GenerateContentConfig{
		SystemInstruction: genai.NewContentFromText(vibeRerankPrompt, genai.RoleUser),
		ThinkingConfig:    &genai.ThinkingConfig{ThinkingBudget: &noThinking},
		ResponseMIMEType:  "application/json",
		ResponseSchema: &genai.Schema{
			Type: genai.TypeObject,
			Properties: map[string]*genai.Schema{
				"keys": {
					Type:  genai.TypeArray,
					Items: &genai.Schema{Type: genai.TypeString},
				},
			},
			Required: []string{"keys"},
		},
		MaxOutputTokens: maxOutputTokens,
		Temperature:     &temperature,
	}

	resp, err := s.client.Models.GenerateContent(ctx, s.model, genai.Text(string(encoded)), cfg)
	if err != nil {
		return nil, fmt.Errorf("gemini rerank: %w", err)
	}
	raw := strings.TrimSpace(resp.Text())
	if raw == "" {
		return nil, errors.New("gemini returned an empty rerank")
	}

	var parsed struct {
		Keys []string `json:"keys"`
	}
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		return nil, fmt.Errorf("parse rerank: %w", err)
	}

	allowed := make(map[string]bool, len(pool))
	for _, candidate := range pool {
		allowed[vibe.CandidateKey(candidate.MediaType, candidate.TMDBID)] = true
	}
	out := make([]string, 0, len(parsed.Keys))
	seen := make(map[string]bool, len(parsed.Keys))
	for _, key := range parsed.Keys {
		key = strings.TrimSpace(key)
		if !allowed[key] || seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, key)
	}
	return out, nil
}

const vibeRerankPrompt = `Користувач описав, що хоче подивитись. Ти отримуєш його фразу
і список реальних тайтлів із назвою, роком, типом і коротким описом.

Впорядкуй їх від найкращого збігу з фразою до найгіршого.

Правила:
- Спирайся на ОПИС, а не лише на назву: він каже, про що фільм насправді.
- Тайтли, які лише формально підходять за жанром, але не відповідають суті фрази,
  став нижче.
- Поверни масив keys у форматі "movie:123" / "tv:456" — ВИКЛЮЧНО ті, що є у списку.
- Нічого не вигадуй і не пропускай тайтли без причини: невпевнені лишай у кінці.`

// maxVibePool caps how many candidates go into the rerank prompt. Forty titles
// with their overviews is a big enough prompt to trip Gemini's own deadline;
// twenty-four covers the first screen and a bit, which is all a person reads
// before refining the phrase.
const maxVibePool = 24
