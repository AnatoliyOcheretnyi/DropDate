package episodes

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

type Service struct{ db *sql.DB }

func NewService(db *sql.DB) *Service { return &Service{db} }

type Progress struct {
	SeasonNumber  int        `json:"seasonNumber"`
	EpisodeNumber int        `json:"episodeNumber"`
	Watched       bool       `json:"watched"`
	WatchedAt     *time.Time `json:"watchedAt,omitempty"`
	Rating        *int       `json:"rating,omitempty"`
}

func (s *Service) List(ctx context.Context, userID string, tmdbID int) ([]Progress, error) {
	rows, e := s.db.QueryContext(ctx, `select season_number,episode_number,watched,watched_at,rating from episode_progress where user_id=$1 and tmdb_id=$2 order by season_number,episode_number`, userID, tmdbID)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	var out []Progress
	for rows.Next() {
		var v Progress
		var t sql.NullTime
		var rating sql.NullInt32
		if e := rows.Scan(&v.SeasonNumber, &v.EpisodeNumber, &v.Watched, &t, &rating); e != nil {
			return nil, e
		}
		if t.Valid {
			v.WatchedAt = &t.Time
		}
		if rating.Valid {
			value := int(rating.Int32)
			v.Rating = &value
		}
		out = append(out, v)
	}
	return out, rows.Err()
}
func (s *Service) Rate(ctx context.Context, userID string, tmdbID, season, episode int, rating *int) error {
	if rating != nil && (*rating < 1 || *rating > 10) {
		return errors.New("rating must be between 1 and 10")
	}
	_, e := s.db.ExecContext(ctx, `insert into episode_progress(user_id,tmdb_id,season_number,episode_number,watched,rating)values($1,$2,$3,$4,false,$5)on conflict(user_id,tmdb_id,season_number,episode_number)do update set rating=excluded.rating,updated_at=now()`, userID, tmdbID, season, episode, rating)
	return e
}
func (s *Service) Set(ctx context.Context, userID string, tmdbID, season, episode int, watched bool) error {
	_, e := s.db.ExecContext(ctx, `insert into episode_progress(user_id,tmdb_id,season_number,episode_number,watched,watched_at)values($1,$2,$3,$4,$5,case when $5 then now() else null end)on conflict(user_id,tmdb_id,season_number,episode_number)do update set watched=excluded.watched,watched_at=excluded.watched_at,updated_at=now()`, userID, tmdbID, season, episode, watched)
	return e
}
func (s *Service) SetSeason(ctx context.Context, userID string, tmdbID, season, episodeCount int, watched bool) error {
	tx, e := s.db.BeginTx(ctx, nil)
	if e != nil {
		return e
	}
	defer tx.Rollback()
	for ep := 1; ep <= episodeCount; ep++ {
		if _, e = tx.ExecContext(ctx, `insert into episode_progress(user_id,tmdb_id,season_number,episode_number,watched,watched_at)values($1,$2,$3,$4,$5,case when $5 then now() else null end)on conflict(user_id,tmdb_id,season_number,episode_number)do update set watched=excluded.watched,watched_at=excluded.watched_at,updated_at=now()`, userID, tmdbID, season, ep, watched); e != nil {
			return e
		}
	}
	return tx.Commit()
}

type ContinueItem struct {
	TMDBID        int       `json:"tmdbId"`
	Title         string    `json:"title"`
	PosterURL     string    `json:"posterUrl"`
	SeasonNumber  int       `json:"seasonNumber"`
	EpisodeNumber int       `json:"episodeNumber"`
	UpdatedAt     time.Time `json:"updatedAt"`
	// WatchedCount is what the user has finished in SeasonNumber; EpisodeCount
	// is how long that season runs. The rail draws a progress bar from the pair,
	// so EpisodeCount is filled in by the transport layer, which already resolves
	// the season against TMDB to validate EpisodeNumber.
	WatchedCount int `json:"watchedCount"`
	EpisodeCount int `json:"episodeCount"`
}

func (s *Service) Continue(ctx context.Context, userID string) ([]ContinueItem, error) {
	rows, e := s.db.QueryContext(ctx, `with active as(select distinct on(tmdb_id)tmdb_id,season_number,updated_at from episode_progress where user_id=$1 and watched order by tmdb_id,updated_at desc),next_ep as(select a.*,coalesce((select min(gs) from generate_series(1,(select coalesce(max(episode_number),0)+1 from episode_progress p where p.user_id=$1 and p.tmdb_id=a.tmdb_id and p.season_number=a.season_number and p.watched))gs where not exists(select 1 from episode_progress p where p.user_id=$1 and p.tmdb_id=a.tmdb_id and p.season_number=a.season_number and p.episode_number=gs and p.watched)),1)episode_number from active a),titles as(select distinct on(tmdb_id)tmdb_id,title,coalesce(poster_url,'')poster_url from saved_titles where user_id=$1 and media_type='tv' order by tmdb_id,updated_at desc)select n.tmdb_id,t.title,t.poster_url,n.season_number,n.episode_number,n.updated_at,(select count(*) from episode_progress p where p.user_id=$1 and p.tmdb_id=n.tmdb_id and p.season_number=n.season_number and p.watched)watched_count from next_ep n join titles t using(tmdb_id)order by n.updated_at desc limit 20`, userID)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	var out []ContinueItem
	for rows.Next() {
		var v ContinueItem
		if e := rows.Scan(&v.TMDBID, &v.Title, &v.PosterURL, &v.SeasonNumber, &v.EpisodeNumber, &v.UpdatedAt, &v.WatchedCount); e != nil {
			return nil, e
		}
		out = append(out, v)
	}
	return out, rows.Err()
}
