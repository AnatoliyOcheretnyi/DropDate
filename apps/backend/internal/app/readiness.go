package app

import (
	"context"
	"database/sql"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/tmdb"
)

type readinessChecker struct {
	db         *sql.DB
	tmdbClient *tmdb.Client
}

func (r readinessChecker) Readiness(ctx context.Context) map[string]error {
	checks := map[string]error{}
	if r.db != nil {
		checks["database"] = r.db.PingContext(ctx)
	}
	if r.tmdbClient != nil {
		checks["tmdb"] = r.tmdbClient.Health(ctx)
	}
	return checks
}
