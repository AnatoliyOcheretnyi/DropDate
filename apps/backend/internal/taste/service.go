package taste

import (
	"context"
	"database/sql"
	"errors"
	"math"
	"sort"
	"time"
)

var catalogs = map[string][]string{
	"genre":   {"action", "comedy", "drama", "science_fiction", "thriller", "adventure", "horror", "romance", "animation", "fantasy", "mystery", "documentary"},
	"country": {"US", "GB", "KR", "JP", "UA", "FR", "ES", "IN"},
}

const (
	TargetComparisons = 8
)

type Item struct {
	ID          string  `json:"id"`
	Score       float64 `json:"score"`
	Comparisons int     `json:"comparisons"`
	Confidence  float64 `json:"confidence"`
}
type Pair struct {
	Kind  string `json:"kind"`
	Left  string `json:"left"`
	Right string `json:"right"`
	Round int    `json:"round"`
}

type TitleFeedback struct {
	TMDBID    int    `json:"tmdbId"`
	MediaType string `json:"mediaType"`
	Title     string `json:"title"`
	PosterURL string `json:"posterUrl,omitempty"`
	Year      string `json:"year,omitempty"`
	Sentiment string `json:"sentiment"`
}

type OnboardingStatus struct {
	Stage                string          `json:"stage"`
	Completed            bool            `json:"completed"`
	GenreComparisons     int             `json:"genreComparisons"`
	CountryComparisons   int             `json:"countryComparisons"`
	TitleFeedbackCount   int             `json:"titleFeedbackCount"`
	TargetComparisons    int             `json:"targetComparisons"`
	TargetTitleFeedback  int             `json:"targetTitleFeedback"`
	SnoozedUntil         *time.Time      `json:"snoozedUntil,omitempty"`
	GenresCompletedAt    *time.Time      `json:"genresCompletedAt,omitempty"`
	CountriesCompletedAt *time.Time      `json:"countriesCompletedAt,omitempty"`
	TitlesCompletedAt    *time.Time      `json:"titlesCompletedAt,omitempty"`
	Titles               []TitleFeedback `json:"titles,omitempty"`
}

type Service struct{ db *sql.DB }

func NewService(db *sql.DB) *Service { return &Service{db: db} }

func (s *Service) OnboardingCompleted(ctx context.Context, userID string) (bool, error) {
	status, err := s.OnboardingStatus(ctx, userID)
	if err != nil {
		return false, err
	}
	return status.Completed, nil
}

func (s *Service) CompleteOnboarding(ctx context.Context, userID string) error {
	_, err := s.db.ExecContext(ctx, `
		update users
		set taste_onboarding_stage='completed',
		    taste_onboarding_titles_completed_at=coalesce(taste_onboarding_titles_completed_at, now()),
		    taste_onboarding_completed_at=coalesce(taste_onboarding_completed_at, now()),
		    taste_onboarding_snoozed_until=null
		where id=$1
	`, userID)
	return err
}

func (s *Service) SnoozeOnboarding(ctx context.Context, userID string, until time.Time) error {
	_, err := s.db.ExecContext(ctx, `update users set taste_onboarding_snoozed_until=$2 where id=$1`, userID, until.UTC())
	return err
}

func (s *Service) RecordTitleFeedback(ctx context.Context, userID string, feedback TitleFeedback) error {
	if feedback.TMDBID == 0 || feedback.Title == "" {
		return errors.New("invalid title feedback")
	}
	switch feedback.MediaType {
	case "movie", "tv":
	default:
		return errors.New("invalid media type")
	}
	switch feedback.Sentiment {
	case "liked", "disliked", "watchlist":
	default:
		return errors.New("invalid sentiment")
	}
	_, err := s.db.ExecContext(ctx, `
		insert into taste_onboarding_title_feedback(user_id, tmdb_id, media_type, title, poster_url, year, sentiment)
		values($1,$2,$3,$4,$5,$6,$7)
		on conflict (user_id, tmdb_id, media_type) do update
		set title=excluded.title,
		    poster_url=excluded.poster_url,
		    year=excluded.year,
		    sentiment=excluded.sentiment,
		    updated_at=now()
	`, userID, feedback.TMDBID, feedback.MediaType, feedback.Title, feedback.PosterURL, feedback.Year, feedback.Sentiment)
	if err != nil {
		return err
	}
	_, err = s.OnboardingStatus(ctx, userID)
	return err
}

func (s *Service) OnboardingStatus(ctx context.Context, userID string) (OnboardingStatus, error) {
	var status OnboardingStatus
	status.TargetComparisons = TargetComparisons
	status.TargetTitleFeedback = 0

	var (
		stage                string
		completedAt          sql.NullTime
		genresCompletedAt    sql.NullTime
		countriesCompletedAt sql.NullTime
		titlesCompletedAt    sql.NullTime
		snoozedUntil         sql.NullTime
	)
	err := s.db.QueryRowContext(ctx, `
		select
		  taste_onboarding_stage,
		  taste_onboarding_completed_at,
		  taste_onboarding_genres_completed_at,
		  taste_onboarding_countries_completed_at,
		  taste_onboarding_titles_completed_at,
		  taste_onboarding_snoozed_until
		from users
		where id=$1
	`, userID).Scan(&stage, &completedAt, &genresCompletedAt, &countriesCompletedAt, &titlesCompletedAt, &snoozedUntil)
	if err != nil {
		return status, err
	}

	genreCount, err := s.comparisonsForKind(ctx, userID, "genre")
	if err != nil {
		return status, err
	}
	countryCount, err := s.comparisonsForKind(ctx, userID, "country")
	if err != nil {
		return status, err
	}
	status.GenreComparisons = genreCount
	status.CountryComparisons = countryCount
	status.TitleFeedbackCount = 0

	now := time.Now().UTC()
	promotedStage := "genre"
	if genreCount >= TargetComparisons {
		promotedStage = "country"
		if !genresCompletedAt.Valid {
			genresCompletedAt = sql.NullTime{Time: now, Valid: true}
		}
	}
	if genreCount >= TargetComparisons && countryCount >= TargetComparisons {
		promotedStage = "completed"
		if !countriesCompletedAt.Valid {
			countriesCompletedAt = sql.NullTime{Time: now, Valid: true}
		}
		if !completedAt.Valid {
			completedAt = sql.NullTime{Time: now, Valid: true}
		}
	}
	if completedAt.Valid {
		promotedStage = "completed"
	}
	// The counters are the source of truth. Keeping the persisted stage when it
	// was "country" used to leave users stuck there after completing the country
	// comparisons (the UI could consequently show values such as 23/8).
	stage = promotedStage

	if genresCompletedAt.Valid {
		value := genresCompletedAt.Time.UTC()
		status.GenresCompletedAt = &value
	}
	if countriesCompletedAt.Valid {
		value := countriesCompletedAt.Time.UTC()
		status.CountriesCompletedAt = &value
	}
	if titlesCompletedAt.Valid {
		value := titlesCompletedAt.Time.UTC()
		status.TitlesCompletedAt = &value
	}
	if snoozedUntil.Valid {
		value := snoozedUntil.Time.UTC()
		status.SnoozedUntil = &value
	}
	status.Stage = stage
	status.Completed = stage == "completed"

	_, err = s.db.ExecContext(ctx, `
		update users
		set taste_onboarding_stage=$2,
		    taste_onboarding_genres_completed_at=coalesce(taste_onboarding_genres_completed_at, $3),
		    taste_onboarding_countries_completed_at=coalesce(taste_onboarding_countries_completed_at, $4),
		    taste_onboarding_titles_completed_at=coalesce(taste_onboarding_titles_completed_at, $5),
		    taste_onboarding_completed_at=coalesce(taste_onboarding_completed_at, $6)
		where id=$1
	`, userID, status.Stage, status.GenresCompletedAt, status.CountriesCompletedAt, status.TitlesCompletedAt, nullTimePtr(completedAt))
	return status, err
}

func (s *Service) SetOnboardingTitles(ctx context.Context, userID string, titles []TitleFeedback) error {
	_, err := s.db.ExecContext(ctx, `update users set taste_onboarding_snoozed_until=null where id=$1`, userID)
	if err != nil {
		return err
	}
	if len(titles) == 0 {
		return nil
	}
	return nil
}

func (s *Service) comparisonsForKind(ctx context.Context, userID, kind string) (int, error) {
	var total int
	err := s.db.QueryRowContext(ctx, `select coalesce(sum(comparisons), 0) / 2 from taste_rankings where user_id=$1 and kind=$2`, userID, kind).Scan(&total)
	return total, err
}

func (s *Service) titleFeedbackCount(ctx context.Context, userID string) (int, error) {
	var total int
	err := s.db.QueryRowContext(ctx, `select count(*) from taste_onboarding_title_feedback where user_id=$1`, userID).Scan(&total)
	return total, err
}

func nullTimePtr(value sql.NullTime) any {
	if !value.Valid {
		return nil
	}
	return value.Time.UTC()
}

func Catalog(kind string) ([]string, bool) {
	ids, ok := catalogs[kind]
	return append([]string(nil), ids...), ok
}

func (s *Service) Rankings(ctx context.Context, userID, kind string) ([]Item, error) {
	ids, ok := Catalog(kind)
	if !ok {
		return nil, errors.New("invalid taste kind")
	}
	items := make(map[string]Item, len(ids))
	for _, id := range ids {
		items[id] = Item{ID: id, Score: 1000}
	}
	rows, err := s.db.QueryContext(ctx, `select item_id, score, comparisons from taste_rankings where user_id=$1 and kind=$2`, userID, kind)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var item Item
		if err := rows.Scan(&item.ID, &item.Score, &item.Comparisons); err != nil {
			return nil, err
		}
		item.Confidence = math.Min(1, float64(item.Comparisons)/8)
		items[item.ID] = item
	}
	out := make([]Item, 0, len(items))
	for _, item := range items {
		out = append(out, item)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Score != out[j].Score {
			return out[i].Score > out[j].Score
		}
		return out[i].ID < out[j].ID
	})
	return out, rows.Err()
}

func (s *Service) NextPair(ctx context.Context, userID, kind string) (Pair, error) {
	items, err := s.Rankings(ctx, userID, kind)
	if err != nil {
		return Pair{}, err
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].Comparisons != items[j].Comparisons {
			return items[i].Comparisons < items[j].Comparisons
		}
		return items[i].ID < items[j].ID
	})
	if len(items) < 2 {
		return Pair{}, errors.New("not enough taste items")
	}
	left := items[0]
	right := items[1]
	bestDistance := math.Abs(left.Score - right.Score)
	for _, candidate := range items[1:] {
		if candidate.ID == left.ID || candidate.Comparisons > left.Comparisons+1 {
			continue
		}
		if distance := math.Abs(left.Score - candidate.Score); distance < bestDistance {
			right = candidate
			bestDistance = distance
		}
	}
	return Pair{Kind: kind, Left: left.ID, Right: right.ID, Round: left.Comparisons + right.Comparisons + 1}, nil
}

func (s *Service) Compare(ctx context.Context, userID, kind, left, right, winner string) error {
	if left == right || (winner != "left" && winner != "right" && winner != "tie") {
		return errors.New("invalid comparison")
	}
	ids, ok := Catalog(kind)
	if !ok {
		return errors.New("invalid taste kind")
	}
	valid := map[string]bool{}
	for _, id := range ids {
		valid[id] = true
	}
	if !valid[left] || !valid[right] {
		return errors.New("invalid comparison")
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	load := func(id string) (float64, error) {
		var score float64
		if _, err := tx.ExecContext(ctx, `insert into taste_rankings(user_id,kind,item_id) values($1,$2,$3) on conflict do nothing`, userID, kind, id); err != nil {
			return 0, err
		}
		err := tx.QueryRowContext(ctx, `select score from taste_rankings where user_id=$1 and kind=$2 and item_id=$3`, userID, kind, id).Scan(&score)
		return score, err
	}
	leftScore, err := load(left)
	if err != nil {
		return err
	}
	rightScore, err := load(right)
	if err != nil {
		return err
	}
	leftNext, rightNext := eloScores(leftScore, rightScore, winner)
	for _, v := range []struct {
		id              string
		score           float64
		won, lost, tied int
	}{{left, leftNext, btoi(winner == "left"), btoi(winner == "right"), btoi(winner == "tie")}, {right, rightNext, btoi(winner == "right"), btoi(winner == "left"), btoi(winner == "tie")}} {
		_, err = tx.ExecContext(ctx, `update taste_rankings set score=$4,comparisons=comparisons+1,wins=wins+$5,losses=losses+$6,ties=ties+$7,updated_at=now() where user_id=$1 and kind=$2 and item_id=$3`, userID, kind, v.id, v.score, v.won, v.lost, v.tied)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

func eloScores(leftScore, rightScore float64, winner string) (float64, float64) {
	expected := 1 / (1 + math.Pow(10, (rightScore-leftScore)/400))
	actual := 0.5
	if winner == "left" {
		actual = 1
	} else if winner == "right" {
		actual = 0
	}
	delta := 24 * (actual - expected)
	return leftScore + delta, rightScore - delta
}
func btoi(value bool) int {
	if value {
		return 1
	}
	return 0
}
