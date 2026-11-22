package atlas

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

type PostgresStore struct{ db *sql.DB }

func NewStore(db *sql.DB) *PostgresStore { return &PostgresStore{db} }
func (s *PostgresStore) List(ctx context.Context) (map[string]Country, error) {
	rows, err := s.db.QueryContext(ctx, `select country_code, posters, refreshed_at, next_refresh_at from world_atlas_countries order by country_code`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]Country{}
	for rows.Next() {
		var code string
		var raw []byte
		var country Country
		if err := rows.Scan(&code, &raw, &country.RefreshedAt, &country.NextRefreshAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(raw, &country.Posters); err != nil {
			return nil, err
		}
		out[code] = country
	}
	return out, rows.Err()
}

// A database lease works with transaction-pooling proxies too, unlike a
// session advisory lock. Its lifetime exceeds the bounded refresh timeout.
func (s *PostgresStore) Acquire(ctx context.Context, owner string) (bool, error) {
	result, err := s.db.ExecContext(ctx, `update world_atlas_job set owner=$1, lease_until=now()+interval '15 minutes' where id=1 and lease_until < now()`, owner)
	if err != nil {
		return false, err
	}
	n, err := result.RowsAffected()
	return n == 1, err
}
func (s *PostgresStore) Release(ctx context.Context, owner string) error {
	_, err := s.db.ExecContext(ctx, `update world_atlas_job set owner='', lease_until='-infinity' where id=1 and owner=$1`, owner)
	return err
}
func (s *PostgresStore) Save(ctx context.Context, owner, code string, posters []Poster) error {
	raw, err := json.Marshal(posters)
	if err != nil {
		return err
	}
	result, err := s.db.ExecContext(ctx, `insert into world_atlas_countries (country_code, posters, refreshed_at, next_refresh_at, attempted_at)
 select $2, $3::jsonb, now(), now()+interval '1 month', now()
 from world_atlas_job where id=1 and owner=$1 and lease_until > now()
 on conflict (country_code) do update set posters=excluded.posters, refreshed_at=excluded.refreshed_at,
 next_refresh_at=excluded.next_refresh_at, attempted_at=excluded.attempted_at`, owner, code, string(raw))
	return checkLeaseWrite(result, err)
}
func (s *PostgresStore) Defer(ctx context.Context, owner, code string) error {
	result, err := s.db.ExecContext(ctx, `insert into world_atlas_countries (country_code, next_refresh_at, attempted_at)
 select $2, now()+interval '6 hours', now() from world_atlas_job where id=1 and owner=$1 and lease_until > now()
 on conflict (country_code) do update set next_refresh_at=excluded.next_refresh_at, attempted_at=excluded.attempted_at`, owner, code)
	return checkLeaseWrite(result, err)
}
func checkLeaseWrite(result sql.Result, err error) error {
	if err != nil {
		return err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if n != 1 {
		return fmt.Errorf("atlas refresh lease expired")
	}
	return nil
}
