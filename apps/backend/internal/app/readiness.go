package app

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/tmdb"
)

type readinessChecker struct {
	db         *sql.DB
	tmdbClient *tmdb.Client
}

func (r readinessChecker) Ready(ctx context.Context) error {
	if r.db != nil {
		if err := r.db.PingContext(ctx); err != nil {
			return fmt.Errorf("database: %w", err)
		}
	}
	if r.tmdbClient != nil {
		if err := r.tmdbClient.Health(ctx); err != nil {
			return fmt.Errorf("tmdb: %w", err)
		}
	}
	return nil
}
