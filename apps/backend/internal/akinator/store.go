package akinator

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

// Store persists the movie feature dataset.
type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// Upsert writes one dataset row.
func (s *Store) Upsert(ctx context.Context, movie Movie) error {
	countries, err := json.Marshal(movie.OriginCountries)
	if err != nil {
		return err
	}
	genres, err := json.Marshal(movie.GenreIDs)
	if err != nil {
		return err
	}
	keywords, err := json.Marshal(movie.Keywords)
	if err != nil {
		return err
	}
	cast, err := json.Marshal(movie.Cast)
	if err != nil {
		return err
	}
	directors, err := json.Marshal(movie.Directors)
	if err != nil {
		return err
	}

	_, err = s.db.ExecContext(ctx, `
		insert into akinator_movies (
			tmdb_id, title, year, poster_url, backdrop_url, popularity,
			vote_average, vote_count, runtime, original_language, is_franchise,
			origin_countries, genre_ids, keywords, cast_members, directors, updated_at
		) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, now())
		on conflict (tmdb_id) do update set
			title = excluded.title,
			year = excluded.year,
			poster_url = excluded.poster_url,
			backdrop_url = excluded.backdrop_url,
			popularity = excluded.popularity,
			vote_average = excluded.vote_average,
			vote_count = excluded.vote_count,
			runtime = excluded.runtime,
			original_language = excluded.original_language,
			is_franchise = excluded.is_franchise,
			origin_countries = excluded.origin_countries,
			genre_ids = excluded.genre_ids,
			keywords = excluded.keywords,
			cast_members = excluded.cast_members,
			directors = excluded.directors,
			updated_at = now()
	`,
		movie.TMDBID, movie.Title, movie.Year, movie.PosterURL, movie.BackdropURL,
		movie.Popularity, movie.VoteAverage, movie.VoteCount, movie.Runtime,
		movie.OriginalLanguage, movie.IsFranchise,
		countries, genres, keywords, cast, directors,
	)
	return err
}

// LoadAll reads the full dataset snapshot.
func (s *Store) LoadAll(ctx context.Context) ([]Movie, error) {
	rows, err := s.db.QueryContext(ctx, `
		select tmdb_id, title, year, poster_url, backdrop_url, popularity,
			vote_average, vote_count, runtime, original_language, is_franchise,
			origin_countries, genre_ids, keywords, cast_members, directors
		from akinator_movies
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	movies := make([]Movie, 0, 2048)
	for rows.Next() {
		var m Movie
		var countries, genres, keywords, cast, directors []byte
		if err := rows.Scan(
			&m.TMDBID, &m.Title, &m.Year, &m.PosterURL, &m.BackdropURL,
			&m.Popularity, &m.VoteAverage, &m.VoteCount, &m.Runtime,
			&m.OriginalLanguage, &m.IsFranchise,
			&countries, &genres, &keywords, &cast, &directors,
		); err != nil {
			return nil, err
		}
		if err := unmarshalInto(countries, &m.OriginCountries); err != nil {
			return nil, fmt.Errorf("movie %d countries: %w", m.TMDBID, err)
		}
		if err := unmarshalInto(genres, &m.GenreIDs); err != nil {
			return nil, fmt.Errorf("movie %d genres: %w", m.TMDBID, err)
		}
		if err := unmarshalInto(keywords, &m.Keywords); err != nil {
			return nil, fmt.Errorf("movie %d keywords: %w", m.TMDBID, err)
		}
		if err := unmarshalInto(cast, &m.Cast); err != nil {
			return nil, fmt.Errorf("movie %d cast: %w", m.TMDBID, err)
		}
		if err := unmarshalInto(directors, &m.Directors); err != nil {
			return nil, fmt.Errorf("movie %d directors: %w", m.TMDBID, err)
		}
		movies = append(movies, m)
	}
	return movies, rows.Err()
}

// Count returns the dataset size without loading it.
func (s *Store) Count(ctx context.Context) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx, `select count(*) from akinator_movies`).Scan(&count)
	return count, err
}

func (s *Store) LogResult(ctx context.Context, input ResultInput) error {
	answers, err := json.Marshal(input.Answers)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `
		insert into akinator_results (session_token, guess_tmdb_id, correct, actual_tmdb_id, answers)
		values ($1, $2, $3, nullif($4, 0), $5)
	`, input.SessionToken, input.GuessTMDBID, input.Correct, input.ActualTMDBID, answers)
	return err
}

func unmarshalInto(raw []byte, dst any) error {
	if len(raw) == 0 {
		return nil
	}
	return json.Unmarshal(raw, dst)
}
