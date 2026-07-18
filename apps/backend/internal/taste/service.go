package taste

import (
	"context"
	"database/sql"
	"errors"
	"math"
	"sort"
)

var catalogs = map[string][]string{
	"genre":   {"action", "comedy", "drama", "science_fiction", "thriller", "adventure", "horror", "romance", "animation", "fantasy", "mystery", "documentary"},
	"country": {"US", "GB", "KR", "JP", "UA", "FR", "ES", "IN"},
}

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

type Service struct{ db *sql.DB }

func NewService(db *sql.DB) *Service { return &Service{db: db} }

func (s *Service) OnboardingCompleted(ctx context.Context, userID string) (bool, error) {
	var completed bool
	err := s.db.QueryRowContext(ctx, `select taste_onboarding_completed_at is not null from users where id=$1`, userID).Scan(&completed)
	return completed, err
}

func (s *Service) CompleteOnboarding(ctx context.Context, userID string) error {
	_, err := s.db.ExecContext(ctx, `update users set taste_onboarding_completed_at=coalesce(taste_onboarding_completed_at,now()) where id=$1`, userID)
	return err
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
