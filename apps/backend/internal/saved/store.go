package saved

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
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
	ListTypes   []string
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
	ListType    string
}

func (s *Store) ListByUser(ctx context.Context, userID string, listType string) ([]Title, error) {
	listType = normalizeListType(listType)
	query := `
		select id, user_id, tmdb_id, media_type, list_type, title, next_release, status,
		       poster_url, backdrop_url, created_at, updated_at
		from saved_titles
		where user_id = $1`
	args := []any{userID}
	if listType != "" {
		query += " and list_type = $2"
		args = append(args, listType)
	}
	query += " order by updated_at desc"

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Title, 0)
	index := make(map[string]int)
	for rows.Next() {
		var item Title
		var nextRelease sql.NullTime
		var poster sql.NullString
		var backdrop sql.NullString
		var rowListType sql.NullString
		if err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.TMDBID,
			&item.MediaType,
			&rowListType,
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

		if rowListType.Valid {
			item.ListTypes = []string{rowListType.String}
		}
		key := fmt.Sprintf("%d:%s", item.TMDBID, item.MediaType)
		if idx, ok := index[key]; ok {
			existing := items[idx]
			if rowListType.Valid && !containsString(existing.ListTypes, rowListType.String) {
				existing.ListTypes = append(existing.ListTypes, rowListType.String)
				items[idx] = existing
			}
			continue
		}
		items = append(items, item)
		index[key] = len(items) - 1
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
	listType := normalizeListType(input.ListType)
	if listType == "" {
		listType = "follow"
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

	var rowListType sql.NullString
	err := s.db.QueryRowContext(ctx, `
		insert into saved_titles (user_id, tmdb_id, media_type, list_type, title, next_release, status, poster_url, backdrop_url)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		on conflict (user_id, tmdb_id, media_type, list_type)
		do update set
			title = excluded.title,
			next_release = excluded.next_release,
			status = excluded.status,
			poster_url = excluded.poster_url,
			backdrop_url = excluded.backdrop_url,
			updated_at = now()
		returning id, user_id, tmdb_id, media_type, list_type, title, next_release, status, poster_url, backdrop_url, created_at, updated_at
	`,
		input.UserID,
		input.TMDBID,
		mediaType,
		listType,
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
		&rowListType,
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
	if rowListType.Valid {
		item.ListTypes = []string{rowListType.String}
	}

	return item, nil
}

func (s *Store) Delete(ctx context.Context, userID string, tmdbID int, mediaType string, listType string) error {
	mediaType = strings.TrimSpace(strings.ToLower(mediaType))
	if listType == "" {
		_, err := s.db.ExecContext(ctx, `
			delete from saved_titles where user_id = $1 and tmdb_id = $2 and media_type = $3
		`, userID, tmdbID, mediaType)
		return err
	}
	listType = normalizeListType(listType)
	if listType == "" {
		listType = "follow"
	}
	_, err := s.db.ExecContext(ctx, `
		delete from saved_titles where user_id = $1 and tmdb_id = $2 and media_type = $3 and list_type = $4
	`, userID, tmdbID, mediaType, listType)
	return err
}

func normalizeListType(value string) string {
	listType := strings.TrimSpace(strings.ToLower(value))
	switch listType {
	case "follow", "watchlist", "favorite":
		return listType
	default:
		return ""
	}
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
