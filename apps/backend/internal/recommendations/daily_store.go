package recommendations

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

type DailyState struct {
	Date     string `json:"date"`
	Pick     *Item  `json:"pick,omitempty"`
	Revealed bool   `json:"revealed"`
	Action   string `json:"action"`
}

type dailyRecord struct {
	Date     string
	Pick     Item
	Revealed bool
	Action   string
}

func (s *Service) loadDailyRecord(ctx context.Context, userID, date string) (*dailyRecord, error) {
	if s.db == nil {
		return nil, sql.ErrConnDone
	}
	row := s.db.QueryRowContext(ctx, `
		select tmdb_id, media_type, title, coalesce(year, ''), coalesce(poster_url, ''), coalesce(reason_text, ''), reason_seed_count, coalesce(reason_primary_source, ''), revealed, action
		from daily_recommendations
		where user_id = $1 and pick_date = $2
	`, userID, date)

	var record dailyRecord
	var pick Item
	if err := row.Scan(
		&pick.TMDBID,
		&pick.MediaType,
		&pick.Title,
		&pick.Year,
		&pick.PosterURL,
		&pick.Reason.Text,
		&pick.Reason.SeedCount,
		&pick.Reason.PrimarySource,
		&record.Revealed,
		&record.Action,
	); err != nil {
		return nil, err
	}
	record.Date = date
	record.Pick = pick
	return &record, nil
}

func (s *Service) saveDailyRecord(ctx context.Context, userID, date string, pick Item) error {
	if s.db == nil {
		return nil
	}
	_, err := s.db.ExecContext(ctx, `
		insert into daily_recommendations(
			user_id, pick_date, tmdb_id, media_type, title, year, poster_url,
			reason_text, reason_seed_count, reason_primary_source
		) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		on conflict (user_id, pick_date) do nothing
	`,
		userID,
		date,
		pick.TMDBID,
		pick.MediaType,
		pick.Title,
		nullIfEmpty(pick.Year),
		nullIfEmpty(pick.PosterURL),
		nullIfEmpty(pick.Reason.Text),
		pick.Reason.SeedCount,
		pick.Reason.PrimarySource,
	)
	return err
}

func (s *Service) updateDailyState(ctx context.Context, userID, date, action string, revealed bool) error {
	if s.db == nil {
		return nil
	}
	_, err := s.db.ExecContext(ctx, `
		update daily_recommendations
		set revealed = $3,
		    action = $4,
		    updated_at = now()
		where user_id = $1 and pick_date = $2
	`, userID, date, revealed, action)
	return err
}

func (s *Service) dailyFeedback(ctx context.Context, userID string, limit int) ([]feedbackSignal, error) {
	if s.db == nil {
		return nil, nil
	}
	rows, err := s.db.QueryContext(ctx, `
		select tmdb_id, media_type, action
		from daily_recommendations
		where user_id = $1 and action in ('saved', 'disliked')
		order by pick_date desc
		limit $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []feedbackSignal
	for rows.Next() {
		var item feedbackSignal
		if err := rows.Scan(&item.TMDBID, &item.MediaType, &item.Action); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

type feedbackSignal struct {
	TMDBID    int
	MediaType string
	Action    string
}

func nullIfEmpty(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func dailyStateFromRecord(record *dailyRecord) DailyState {
	if record == nil {
		return DailyState{}
	}
	pick := record.Pick
	return DailyState{
		Date:     record.Date,
		Pick:     &pick,
		Revealed: record.Revealed,
		Action:   record.Action,
	}
}

var ErrInvalidDailyAction = errors.New("invalid daily action")

func normalizeDailyAction(value string) (string, error) {
	switch value {
	case "", "none":
		return "none", nil
	case "saved":
		return "saved", nil
	case "disliked":
		return "disliked", nil
	default:
		return "", ErrInvalidDailyAction
	}
}

func todayUTC(now time.Time) string {
	return now.UTC().Format(time.DateOnly)
}
