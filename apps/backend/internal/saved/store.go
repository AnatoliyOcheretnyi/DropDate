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
	ID             string
	UserID         string
	TMDBID         int
	MediaType      string
	Title          string
	NextRelease    *time.Time
	Status         string
	PosterURL      string
	BackdropURL    string
	ListTypes      []string
	UserRating     *int
	WatchCount     int
	LastWatched    *time.Time
	RuntimeMinutes *int
	EpisodeCount   *int
	TMDBRating     *float64
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type FollowItem struct {
	UserID      string
	TMDBID      int
	MediaType   string
	Title       string
	PosterURL   string
	BackdropURL string
}

type UpsertInput struct {
	UserID         string
	TMDBID         int
	MediaType      string
	Title          string
	NextRelease    *time.Time
	Status         string
	PosterURL      string
	BackdropURL    string
	ListType       string
	UserRating     *int
	WatchCount     *int
	LastWatched    *time.Time
	RuntimeMinutes *int
	EpisodeCount   *int
	TMDBRating     *float64
}

func (s *Store) ListByUser(ctx context.Context, userID string, listType string) ([]Title, error) {
	listType = normalizeListType(listType)
	query := `
		select id, user_id, tmdb_id, media_type, list_type, title, next_release, status,
		       poster_url, backdrop_url, user_rating, watch_count, last_watched_at,
		       runtime_minutes, episode_count, tmdb_rating, created_at, updated_at
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
		var userRating sql.NullInt32
		var lastWatched sql.NullTime
		var runtime sql.NullInt32
		var episodeCount sql.NullInt32
		var tmdbRating sql.NullFloat64
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
			&userRating,
			&item.WatchCount,
			&lastWatched,
			&runtime,
			&episodeCount,
			&tmdbRating,
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
		if userRating.Valid {
			rating := int(userRating.Int32)
			item.UserRating = &rating
		}
		if lastWatched.Valid {
			item.LastWatched = &lastWatched.Time
		}
		if runtime.Valid {
			value := int(runtime.Int32)
			item.RuntimeMinutes = &value
		}
		if episodeCount.Valid {
			value := int(episodeCount.Int32)
			item.EpisodeCount = &value
		}
		if tmdbRating.Valid {
			value := tmdbRating.Float64
			item.TMDBRating = &value
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

func (s *Store) ListFollowSubscriptions(ctx context.Context) ([]FollowItem, error) {
	rows, err := s.db.QueryContext(ctx, `
		select user_id, tmdb_id, media_type, title, poster_url, backdrop_url
		from saved_titles
		where list_type = 'follow'
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]FollowItem, 0)
	for rows.Next() {
		var item FollowItem
		var poster sql.NullString
		var backdrop sql.NullString
		if err := rows.Scan(
			&item.UserID,
			&item.TMDBID,
			&item.MediaType,
			&item.Title,
			&poster,
			&backdrop,
		); err != nil {
			return nil, err
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
	var userRating sql.NullInt32
	if input.UserRating != nil {
		userRating = sql.NullInt32{Int32: int32(*input.UserRating), Valid: true}
	}
	var runtime sql.NullInt32
	if input.RuntimeMinutes != nil {
		runtime = sql.NullInt32{Int32: int32(*input.RuntimeMinutes), Valid: true}
	}
	var episodeCount sql.NullInt32
	if input.EpisodeCount != nil {
		episodeCount = sql.NullInt32{Int32: int32(*input.EpisodeCount), Valid: true}
	}
	var tmdbRating sql.NullFloat64
	if input.TMDBRating != nil {
		tmdbRating = sql.NullFloat64{Float64: *input.TMDBRating, Valid: true}
	}
	watchCountValue := 0
	watchCountProvided := false
	if input.WatchCount != nil {
		watchCountValue = *input.WatchCount
		watchCountProvided = true
	}
	var lastWatched sql.NullTime
	if input.LastWatched != nil {
		lastWatched = sql.NullTime{Time: *input.LastWatched, Valid: true}
	}

	var rowListType sql.NullString
	err := s.db.QueryRowContext(ctx, `
		insert into saved_titles (
			user_id, tmdb_id, media_type, list_type, title, next_release, status,
			poster_url, backdrop_url, user_rating, watch_count, last_watched_at,
			runtime_minutes, episode_count, tmdb_rating
		)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		on conflict (user_id, tmdb_id, media_type, list_type)
		do update set
			title = excluded.title,
			next_release = excluded.next_release,
			status = excluded.status,
			poster_url = excluded.poster_url,
			backdrop_url = excluded.backdrop_url,
			user_rating = coalesce(excluded.user_rating, saved_titles.user_rating),
			watch_count = case when $16 then excluded.watch_count else saved_titles.watch_count end,
			last_watched_at = coalesce(excluded.last_watched_at, saved_titles.last_watched_at),
			runtime_minutes = coalesce(excluded.runtime_minutes, saved_titles.runtime_minutes),
			episode_count = coalesce(excluded.episode_count, saved_titles.episode_count),
			tmdb_rating = coalesce(excluded.tmdb_rating, saved_titles.tmdb_rating),
			updated_at = now()
		returning id, user_id, tmdb_id, media_type, list_type, title, next_release, status,
		          poster_url, backdrop_url, user_rating, watch_count, last_watched_at,
		          runtime_minutes, episode_count, tmdb_rating, created_at, updated_at
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
		userRating,
		watchCountValue,
		lastWatched,
		runtime,
		episodeCount,
		tmdbRating,
		watchCountProvided,
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
		&userRating,
		&item.WatchCount,
		&lastWatched,
		&runtime,
		&episodeCount,
		&tmdbRating,
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
	if userRating.Valid {
		rating := int(userRating.Int32)
		item.UserRating = &rating
	}
	if lastWatched.Valid {
		item.LastWatched = &lastWatched.Time
	}
	if runtime.Valid {
		value := int(runtime.Int32)
		item.RuntimeMinutes = &value
	}
	if episodeCount.Valid {
		value := int(episodeCount.Int32)
		item.EpisodeCount = &value
	}
	if tmdbRating.Valid {
		value := tmdbRating.Float64
		item.TMDBRating = &value
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

func (s *Store) RemoveStatusLists(ctx context.Context, userID string, tmdbID int, mediaType string, keepType string) error {
	mediaType = strings.TrimSpace(strings.ToLower(mediaType))
	keepType = normalizeListType(keepType)
	if keepType == "" {
		return nil
	}
	_, err := s.db.ExecContext(ctx, `
		delete from saved_titles
		where user_id = $1 and tmdb_id = $2 and media_type = $3
		  and list_type in ('favorite', 'watched', 'disliked')
		  and list_type <> $4
	`, userID, tmdbID, mediaType, keepType)
	return err
}

func (s *Store) UpdateStats(
	ctx context.Context,
	userID string,
	tmdbID int,
	mediaType string,
	listType string,
	userRating *int,
	watchCount *int,
	lastWatched *time.Time,
) error {
	mediaType = strings.TrimSpace(strings.ToLower(mediaType))
	listType = normalizeListType(listType)
	if listType == "" {
		listType = "follow"
	}
	var rating sql.NullInt32
	if userRating != nil {
		rating = sql.NullInt32{Int32: int32(*userRating), Valid: true}
	}
	var count sql.NullInt32
	if watchCount != nil {
		count = sql.NullInt32{Int32: int32(*watchCount), Valid: true}
	}
	var watched sql.NullTime
	if lastWatched != nil {
		watched = sql.NullTime{Time: *lastWatched, Valid: true}
	}
	_, err := s.db.ExecContext(ctx, `
		update saved_titles
		set user_rating = coalesce($5, user_rating),
		    watch_count = coalesce($6, watch_count),
		    last_watched_at = coalesce($7, last_watched_at),
		    updated_at = now()
		where user_id = $1 and tmdb_id = $2 and media_type = $3 and list_type = $4
	`, userID, tmdbID, mediaType, listType, rating, count, watched)
	return err
}

func normalizeListType(value string) string {
	listType := strings.TrimSpace(strings.ToLower(value))
	switch listType {
	case "follow", "watchlist", "favorite", "watched", "disliked":
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
