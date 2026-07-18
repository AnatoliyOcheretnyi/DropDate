package gamestats

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

var ErrForbidden = errors.New("forbidden")

type Service struct{ db *sql.DB }

func NewService(db *sql.DB) *Service { return &Service{db} }

type Stats struct {
	GameID       string    `json:"gameId"`
	Plays        int       `json:"plays"`
	BestScore    int       `json:"bestScore"`
	BestStreak   int       `json:"bestStreak"`
	LastPlayedAt time.Time `json:"lastPlayedAt"`
}

func (s *Service) Record(ctx context.Context, userID, gameID string, score, streak int, daily bool) error {
	_, err := s.db.ExecContext(ctx, `insert into game_results(user_id,game_id,score,best_streak,daily) values($1,$2,$3,$4,$5)`, userID, gameID, score, streak, daily)
	return err
}
func (s *Service) Stats(ctx context.Context, userID string) ([]Stats, int, error) {
	rows, err := s.db.QueryContext(ctx, `select game_id,count(*),max(score),max(best_streak),max(played_at) from game_results where user_id=$1 group by game_id`, userID)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []Stats
	for rows.Next() {
		var v Stats
		if err := rows.Scan(&v.GameID, &v.Plays, &v.BestScore, &v.BestStreak, &v.LastPlayedAt); err != nil {
			return nil, 0, err
		}
		out = append(out, v)
	}
	var streak int
	_ = s.db.QueryRowContext(ctx, `with days as(select distinct played_at::date d from game_results where user_id=$1 and daily), ranked as(select d,d-row_number() over(order by d)::int grp from days) select coalesce(max(c),0) from(select count(*) c from ranked group by grp)x`, userID).Scan(&streak)
	return out, streak, rows.Err()
}

type Leader struct {
	UserID string `json:"userId"`
	Name   string `json:"name"`
	Score  int    `json:"score"`
	Plays  int    `json:"plays"`
}

func (s *Service) Leaderboard(ctx context.Context, userID string) ([]Leader, error) {
	rows, e := s.db.QueryContext(ctx, `with allowed as(select $1::uuid id union select case when requester_id=$1 then addressee_id else requester_id end from friendships where status='accepted' and(requester_id=$1 or addressee_id=$1))select u.id,coalesce(u.username,u.email),coalesce(sum(g.score),0),count(g.id) from allowed a join users u on u.id=a.id left join game_results g on g.user_id=a.id group by u.id,u.username,u.email order by sum(g.score) desc nulls last limit 10`, userID)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	var out []Leader
	for rows.Next() {
		var v Leader
		if e := rows.Scan(&v.UserID, &v.Name, &v.Score, &v.Plays); e != nil {
			return nil, e
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

type Challenge struct {
	ID            string    `json:"id"`
	CreatorID     string    `json:"creatorId"`
	OpponentID    string    `json:"opponentId"`
	GameID        string    `json:"gameId"`
	Seed          int64     `json:"seed"`
	CreatorScore  *int      `json:"creatorScore,omitempty"`
	OpponentScore *int      `json:"opponentScore,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
}

func (s *Service) Challenges(ctx context.Context, userID string) ([]Challenge, error) {
	rows, err := s.db.QueryContext(ctx, `select id,creator_id,opponent_id,game_id,seed,creator_score,opponent_score,created_at from game_challenges where creator_id=$1 or opponent_id=$1 order by created_at desc limit 30`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Challenge
	for rows.Next() {
		var v Challenge
		if err := rows.Scan(&v.ID, &v.CreatorID, &v.OpponentID, &v.GameID, &v.Seed, &v.CreatorScore, &v.OpponentScore, &v.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (s *Service) CreateChallenge(ctx context.Context, creator, opponent, gameID string, seed int64) (Challenge, error) {
	var friend bool
	if err := s.db.QueryRowContext(ctx, `select exists(select 1 from friendships where status='accepted' and ((requester_id=$1 and addressee_id=$2)or(requester_id=$2 and addressee_id=$1)))`, creator, opponent).Scan(&friend); err != nil {
		return Challenge{}, err
	}
	if !friend {
		return Challenge{}, ErrForbidden
	}
	var v Challenge
	err := s.db.QueryRowContext(ctx, `insert into game_challenges(creator_id,opponent_id,game_id,seed)values($1,$2,$3,$4)returning id,creator_id,opponent_id,game_id,seed,creator_score,opponent_score,created_at`, creator, opponent, gameID, seed).Scan(&v.ID, &v.CreatorID, &v.OpponentID, &v.GameID, &v.Seed, &v.CreatorScore, &v.OpponentScore, &v.CreatedAt)
	return v, err
}
func (s *Service) Submit(ctx context.Context, userID, id string, score int) error {
	res, err := s.db.ExecContext(ctx, `update game_challenges set creator_score=case when creator_id=$1 then $3 else creator_score end,opponent_score=case when opponent_id=$1 then $3 else opponent_score end,completed_at=case when (creator_id=$1 and opponent_score is not null)or(opponent_id=$1 and creator_score is not null)then now()else completed_at end where id=$2 and (creator_id=$1 or opponent_id=$1)`, userID, id, score)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrForbidden
	}
	return nil
}
