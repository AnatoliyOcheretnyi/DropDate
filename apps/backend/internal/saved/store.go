package saved

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

var ErrInvalidMediaType = errors.New("invalid media type")

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

type Title struct {
	ID          string
	UserID      string
	TMDBID      int
	MediaType   string
	Title       string
	NextRelease *time.Time
	Status      string
	PosterURL   string
	BackdropURL string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type UpsertInput struct {
	UserID      string
	TMDBID      int
	MediaType   string
	Title       string
	NextRelease *time.Time
	Status      string
	PosterURL   string
	BackdropURL string
}

func (s *Store) ListByUser(ctx context.Context, userID string) ([]Title, error) {
	rows, err := s.db.QueryContext(ctx, `
		select id, user_id, tmdb_id, media_type, title, next_release, status,
		       poster_url, backdrop_url, created_at, updated_at
		from saved_titles
		where user_id = $1
		order by updated_at desc`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Title
	for rows.Next() {
		var item Title
		var nextRelease sql.NullTime
		var poster sql.NullString
		var backdrop sql.NullString
		if err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.TMDBID,
			&item.MediaType,
			&item.Title,
			&nextRelease,
			&item.Status,
			&poster,
			&backdrop,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if nextRelease.Valid {
			item.NextRelease = &nextRelease.Time
		}
		if poster.Valid {
			item.PosterURL = poster.String
		}
		if backdrop.Valid {
			item.BackdropURL = backdrop.String
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

func (s *Store) Upsert(ctx context.Context, input UpsertInput) (Title, error) {
	mediaType := strings.TrimSpace(strings.ToLower(input.MediaType))
	if mediaType != "movie" && mediaType != "tv" {
		return Title{}, ErrInvalidMediaType
	}
	status := strings.TrimSpace(input.Status)
	if status == "" {
		status = "upcoming"
	}

	var item Title
	var nextRelease sql.NullTime
	if input.NextRelease != nil {
		nextRelease = sql.NullTime{Time: *input.NextRelease, Valid: true}
	}

	var poster sql.NullString
	if input.PosterURL != "" {
		poster = sql.NullString{String: input.PosterURL, Valid: true}
	}
	var backdrop sql.NullString
	if input.BackdropURL != "" {
		backdrop = sql.NullString{String: input.BackdropURL, Valid: true}
	}

	err := s.db.QueryRowContext(ctx, `
		insert into saved_titles (user_id, tmdb_id, media_type, title, next_release, status, poster_url, backdrop_url)
		values ($1, $2, $3, $4, $5, $6, $7, $8)
		on conflict (user_id, tmdb_id, media_type)
		do update set
			title = excluded.title,
			next_release = excluded.next_release,
			status = excluded.status,
			poster_url = excluded.poster_url,
			backdrop_url = excluded.backdrop_url,
			updated_at = now()
		returning id, user_id, tmdb_id, media_type, title, next_release, status, poster_url, backdrop_url, created_at, updated_at
	`,
		input.UserID,
		input.TMDBID,
		mediaType,
		input.Title,
		nextRelease,
		status,
		poster,
		backdrop,
	).Scan(
		&item.ID,
		&item.UserID,
		&item.TMDBID,
		&item.MediaType,
		&item.Title,
		&nextRelease,
		&item.Status,
		&poster,
		&backdrop,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return Title{}, err
	}

	if nextRelease.Valid {
		item.NextRelease = &nextRelease.Time
	}
	if poster.Valid {
		item.PosterURL = poster.String
	}
	if backdrop.Valid {
		item.BackdropURL = backdrop.String
	}

	return item, nil
}

func (s *Store) Delete(ctx context.Context, userID string, tmdbID int, mediaType string) error {
	_, err := s.db.ExecContext(ctx, `
		delete from saved_titles where user_id = $1 and tmdb_id = $2 and media_type = $3
	`, userID, tmdbID, strings.TrimSpace(strings.ToLower(mediaType)))
	return err
}
