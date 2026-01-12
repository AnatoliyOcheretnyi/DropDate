package notifications

import (
	"context"
	"database/sql"
	"time"
)

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

type Notification struct {
	ID            string
	UserID        string
	TMDBID        int
	MediaType     string
	Title         string
	EventType     string
	EventKey      string
	SeasonNumber  *int
	EpisodeNumber *int
	EpisodeName   string
	ReleaseDate   *time.Time
	PosterURL     string
	BackdropURL   string
	ReadAt        *time.Time
	CreatedAt     time.Time
}

type CreateInput struct {
	UserID        string
	TMDBID        int
	MediaType     string
	Title         string
	EventType     string
	EventKey      string
	SeasonNumber  *int
	EpisodeNumber *int
	EpisodeName   string
	ReleaseDate   *time.Time
	PosterURL     string
	BackdropURL   string
}

func (s *Store) Create(ctx context.Context, input CreateInput) (Notification, bool, error) {
	var season sql.NullInt32
	if input.SeasonNumber != nil {
		season = sql.NullInt32{Int32: int32(*input.SeasonNumber), Valid: true}
	}
	var episode sql.NullInt32
	if input.EpisodeNumber != nil {
		episode = sql.NullInt32{Int32: int32(*input.EpisodeNumber), Valid: true}
	}
	var releaseDate sql.NullTime
	if input.ReleaseDate != nil {
		releaseDate = sql.NullTime{Time: *input.ReleaseDate, Valid: true}
	}
	var poster sql.NullString
	if input.PosterURL != "" {
		poster = sql.NullString{String: input.PosterURL, Valid: true}
	}
	var backdrop sql.NullString
	if input.BackdropURL != "" {
		backdrop = sql.NullString{String: input.BackdropURL, Valid: true}
	}

	var item Notification
	var readAt sql.NullTime
	err := s.db.QueryRowContext(ctx, `
		insert into notifications (
			user_id, tmdb_id, media_type, title, event_type, event_key,
			season_number, episode_number, episode_name, release_date, poster_url, backdrop_url
		)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		on conflict (user_id, tmdb_id, media_type, event_key) do nothing
		returning id, user_id, tmdb_id, media_type, title, event_type, event_key,
		          season_number, episode_number, episode_name, release_date, poster_url, backdrop_url, read_at, created_at
	`,
		input.UserID,
		input.TMDBID,
		input.MediaType,
		input.Title,
		input.EventType,
		input.EventKey,
		season,
		episode,
		input.EpisodeName,
		releaseDate,
		poster,
		backdrop,
	).Scan(
		&item.ID,
		&item.UserID,
		&item.TMDBID,
		&item.MediaType,
		&item.Title,
		&item.EventType,
		&item.EventKey,
		&season,
		&episode,
		&item.EpisodeName,
		&releaseDate,
		&poster,
		&backdrop,
		&readAt,
		&item.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return Notification{}, false, nil
		}
		return Notification{}, false, err
	}
	item.SeasonNumber = nullIntToPtr(season)
	item.EpisodeNumber = nullIntToPtr(episode)
	if releaseDate.Valid {
		item.ReleaseDate = &releaseDate.Time
	}
	if poster.Valid {
		item.PosterURL = poster.String
	}
	if backdrop.Valid {
		item.BackdropURL = backdrop.String
	}
	if readAt.Valid {
		item.ReadAt = &readAt.Time
	}
	return item, true, nil
}

func (s *Store) ListByUser(ctx context.Context, userID string, limit int) ([]Notification, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.db.QueryContext(ctx, `
		select id, user_id, tmdb_id, media_type, title, event_type, event_key,
		       season_number, episode_number, episode_name, release_date,
		       poster_url, backdrop_url, read_at, created_at
		from notifications
		where user_id = $1
		order by created_at desc
		limit $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Notification, 0)
	for rows.Next() {
		var item Notification
		var season sql.NullInt32
		var episode sql.NullInt32
		var releaseDate sql.NullTime
		var poster sql.NullString
		var backdrop sql.NullString
		var readAt sql.NullTime
		if err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.TMDBID,
			&item.MediaType,
			&item.Title,
			&item.EventType,
			&item.EventKey,
			&season,
			&episode,
			&item.EpisodeName,
			&releaseDate,
			&poster,
			&backdrop,
			&readAt,
			&item.CreatedAt,
		); err != nil {
			return nil, err
		}
		item.SeasonNumber = nullIntToPtr(season)
		item.EpisodeNumber = nullIntToPtr(episode)
		if releaseDate.Valid {
			item.ReleaseDate = &releaseDate.Time
		}
		if poster.Valid {
			item.PosterURL = poster.String
		}
		if backdrop.Valid {
			item.BackdropURL = backdrop.String
		}
		if readAt.Valid {
			item.ReadAt = &readAt.Time
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

func (s *Store) CountUnread(ctx context.Context, userID string) (int, error) {
	var count int
	if err := s.db.QueryRowContext(ctx, `
		select count(*) from notifications where user_id = $1 and read_at is null
	`, userID).Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}

func (s *Store) MarkRead(ctx context.Context, userID string, ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	_, err := s.db.ExecContext(ctx, `
		update notifications set read_at = now()
		where user_id = $1 and id = any($2)
	`, userID, ids)
	return err
}

func (s *Store) MarkAllRead(ctx context.Context, userID string) error {
	_, err := s.db.ExecContext(ctx, `
		update notifications set read_at = now()
		where user_id = $1 and read_at is null
	`, userID)
	return err
}

func nullIntToPtr(value sql.NullInt32) *int {
	if !value.Valid {
		return nil
	}
	parsed := int(value.Int32)
	return &parsed
}
