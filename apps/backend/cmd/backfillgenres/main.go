// Command backfillgenres fills the genres column for saved titles written
// before migration 023.
//
// Genres are captured from TMDB at save time, so only rows that predate the
// column need this. Until it runs, the genre filter on "Мій список" stays
// hidden for existing libraries — the client hides the row while fewer than two
// distinct genres are present.
//
// Usage:
//
//	go run ./cmd/backfillgenres [-limit 0] [-pause 250ms] [-dry-run]
package main

import (
	"context"
	"database/sql"
	"flag"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/config"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/tmdb"
	_ "github.com/jackc/pgx/v5/stdlib"
)

type target struct {
	tmdbID    int
	mediaType string
	rows      int
}

func main() {
	limit := flag.Int("limit", 0, "stop after N titles (0 = all)")
	pause := flag.Duration("pause", 250*time.Millisecond, "pause between TMDB lookups")
	dryRun := flag.Bool("dry-run", false, "look up genres but do not write them")
	flag.Parse()

	config.LoadEnvFiles(
		"apps/backend/.env.local",
		"apps/backend/.env",
		".env.local",
		".env",
	)

	dsn := strings.TrimSpace(os.Getenv("SUPABASE_CONNECTION_STRING"))
	if dsn == "" {
		log.Fatal("SUPABASE_CONNECTION_STRING is required")
	}
	token := strings.TrimSpace(os.Getenv("TMDB_ACCESS_TOKEN"))
	if token == "" {
		log.Fatal("TMDB_ACCESS_TOKEN is required")
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("db open failed: %v", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		log.Fatalf("db ping failed: %v", err)
	}

	logger := log.New(os.Stdout, "", log.LstdFlags)
	client, err := tmdb.NewClient(&http.Client{Timeout: 15 * time.Second}, token)
	if err != nil {
		log.Fatalf("tmdb client failed: %v", err)
	}
	provider := release.NewTMDBProvider(client)
	if provider == nil {
		log.Fatal("tmdb provider unavailable")
	}
	service := release.NewService(
		[]release.ReleaseProvider{provider},
		release.NewTMDBSuggestionProvider(client),
		logger,
	)

	ctx := context.Background()
	targets, err := pendingTargets(ctx, db, *limit)
	if err != nil {
		log.Fatalf("scan failed: %v", err)
	}
	if len(targets) == 0 {
		logger.Printf("nothing to backfill")
		return
	}
	logger.Printf("backfilling %d titles", len(targets))

	var updated, skipped, failed int
	for i, item := range targets {
		details, err := service.Details(ctx, item.tmdbID, item.mediaType)
		if err != nil {
			failed++
			logger.Printf("[%d/%d] %s:%d lookup failed: %v", i+1, len(targets), item.mediaType, item.tmdbID, err)
			time.Sleep(*pause)
			continue
		}
		if len(details.Genres) == 0 {
			skipped++
			logger.Printf("[%d/%d] %s:%d has no genres on TMDB", i+1, len(targets), item.mediaType, item.tmdbID)
			time.Sleep(*pause)
			continue
		}
		if *dryRun {
			logger.Printf("[%d/%d] %s:%d → %s (dry run, %d rows)",
				i+1, len(targets), item.mediaType, item.tmdbID, strings.Join(details.Genres, ", "), item.rows)
		} else {
			rows, err := writeGenres(ctx, db, item, details.Genres)
			if err != nil {
				failed++
				logger.Printf("[%d/%d] %s:%d write failed: %v", i+1, len(targets), item.mediaType, item.tmdbID, err)
				time.Sleep(*pause)
				continue
			}
			logger.Printf("[%d/%d] %s:%d → %s (%d rows)",
				i+1, len(targets), item.mediaType, item.tmdbID, strings.Join(details.Genres, ", "), rows)
		}
		updated++
		time.Sleep(*pause)
	}

	logger.Printf("done: %d updated, %d without genres, %d failed", updated, skipped, failed)
}

// pendingTargets groups the work by title, not by row: the same title sits in
// several lists and TMDB only needs to be asked once for all of them.
func pendingTargets(ctx context.Context, db *sql.DB, limit int) ([]target, error) {
	query := `
		select tmdb_id, media_type, count(*)
		from saved_titles
		where coalesce(cardinality(genres), 0) = 0
		group by tmdb_id, media_type
		order by count(*) desc, tmdb_id`
	args := []any{}
	if limit > 0 {
		query += " limit $1"
		args = append(args, limit)
	}

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	targets := make([]target, 0)
	for rows.Next() {
		var item target
		if err := rows.Scan(&item.tmdbID, &item.mediaType, &item.rows); err != nil {
			return nil, err
		}
		targets = append(targets, item)
	}
	return targets, rows.Err()
}

func writeGenres(ctx context.Context, db *sql.DB, item target, genres []string) (int64, error) {
	result, err := db.ExecContext(ctx, `
		update saved_titles
		set genres = string_to_array($1, '|')
		where tmdb_id = $2 and media_type = $3 and coalesce(cardinality(genres), 0) = 0
	`, strings.Join(genres, "|"), item.tmdbID, item.mediaType)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}
