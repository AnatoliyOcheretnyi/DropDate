package recommendations

import (
	"context"
	"errors"
	"strings"
)

// ErrInvalidFeedback is returned for an unknown feedback action.
var ErrInvalidFeedback = errors.New("invalid recommendation feedback")

// Feedback is one persistent thumbs-up/down left on a recommendation card.
type Feedback struct {
	TMDBID    int    `json:"tmdbId"`
	MediaType string `json:"mediaType"`
	Title     string `json:"title"`
	Action    string `json:"action"` // liked | disliked
}

// SetFeedback records the user's verdict on a recommended title. `action`
// accepts "liked", "disliked" or "none" (which clears a previous verdict).
func (s *Service) SetFeedback(ctx context.Context, userID string, tmdbID int, mediaType, title, action string) error {
	if s.db == nil {
		return nil
	}
	mediaType = strings.TrimSpace(strings.ToLower(mediaType))
	if tmdbID <= 0 || (mediaType != "movie" && mediaType != "tv") {
		return ErrInvalidFeedback
	}
	switch action {
	case "none":
		_, err := s.db.ExecContext(ctx, `
			delete from rec_feedback
			where user_id = $1 and tmdb_id = $2 and media_type = $3
		`, userID, tmdbID, mediaType)
		return err
	case "liked", "disliked":
		_, err := s.db.ExecContext(ctx, `
			insert into rec_feedback (user_id, tmdb_id, media_type, title, action)
			values ($1, $2, $3, $4, $5)
			on conflict (user_id, tmdb_id, media_type)
			do update set action = excluded.action, title = excluded.title, updated_at = now()
		`, userID, tmdbID, mediaType, strings.TrimSpace(title), action)
		return err
	default:
		return ErrInvalidFeedback
	}
}

// Feedback returns the user's complete card-verdict history, newest first.
func (s *Service) Feedback(ctx context.Context, userID string) ([]Feedback, error) {
	if s.db == nil {
		return nil, nil
	}
	rows, err := s.db.QueryContext(ctx, `
		select tmdb_id, media_type, coalesce(title, ''), action
		from rec_feedback
		where user_id = $1
		order by updated_at desc
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Feedback
	for rows.Next() {
		var row Feedback
		if err := rows.Scan(&row.TMDBID, &row.MediaType, &row.Title, &row.Action); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

// applyRecFeedback folds card verdicts into the seed/exclusion sets: a liked
// card becomes a positive seed, a disliked one is excluded outright and acts
// as an anti-seed so its lookalikes sink too.
func (s *Service) applyRecFeedback(ctx context.Context, userID string, exclusions *map[string]bool, seeds *[]seed) {
	feedback, err := s.Feedback(ctx, userID)
	if err != nil || len(feedback) == 0 {
		return
	}
	seedIndex := make(map[string]bool, len(*seeds))
	for _, existing := range *seeds {
		seedIndex[existing.key()] = true
	}
	likes, dislikes := 0, 0
	for _, row := range feedback {
		key := candidateKey(row.TMDBID, row.MediaType)
		if row.Action == "disliked" {
			(*exclusions)[key] = true
			if !seedIndex[key] && dislikes < maxNegativeSeeds {
				*seeds = append(*seeds, seed{
					tmdbID:    row.TMDBID,
					mediaType: row.MediaType,
					weight:    weightDislikedSeed,
					source:    "rec_disliked",
					title:     row.Title,
				})
				seedIndex[key] = true
				dislikes++
			}
			continue
		}
		if row.Action != "liked" || seedIndex[key] || likes >= maxSeeds/2 {
			continue
		}
		*seeds = append(*seeds, seed{
			tmdbID:    row.TMDBID,
			mediaType: row.MediaType,
			weight:    weightRecLiked,
			source:    "rec_liked",
			recent:    true,
			title:     row.Title,
		})
		seedIndex[key] = true
		likes++
	}
}
