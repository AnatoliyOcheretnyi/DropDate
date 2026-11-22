package atlas

import (
	"context"
	"database/sql"
	"fmt"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/config"
	_ "github.com/jackc/pgx/v5/stdlib"
	"net/url"
	"os"
	"testing"
	"time"
)

func TestPostgresAtlasPersistenceLeaseAndMonthlySchedule(t *testing.T) {
	if os.Getenv("ATLAS_INTEGRATION") != "1" {
		t.Skip("ATLAS_INTEGRATION=1 uses an isolated schema in the configured database")
	}
	config.LoadEnvFiles("../../.env.local", "../../.env")
	dsn := os.Getenv("SUPABASE_CONNECTION_STRING")
	admin, err := sql.Open("pgx", dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	schema := fmt.Sprintf("atlas_test_%d", time.Now().UnixNano())
	if _, err = admin.Exec("create schema " + schema); err != nil {
		t.Fatal(err)
	}
	defer admin.Exec("drop schema " + schema + " cascade")
	u, err := url.Parse(dsn)
	if err != nil {
		t.Fatal(err)
	}
	q := u.Query()
	q.Set("search_path", schema)
	u.RawQuery = q.Encode()
	db, err := sql.Open("pgx", u.String())
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.SetMaxOpenConns(2)
	raw, err := os.ReadFile("../../migrations/025_world_atlas.sql")
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 2; i++ {
		if _, err = db.Exec(string(raw)); err != nil {
			t.Fatal(err)
		}
	}
	ctx := context.Background()
	a, b := NewStore(db), NewStore(db)
	if ok, err := a.Acquire(ctx, "a"); err != nil || !ok {
		t.Fatalf("first lease: %v %v", ok, err)
	}
	if ok, err := b.Acquire(ctx, "b"); err != nil || ok {
		t.Fatal("second worker acquired live lease")
	}
	posters := []Poster{{TMDBID: 42, MediaType: "movie", Title: "Poster", PosterURL: "https://image.tmdb.org/t/p/w185/42.jpg"}}
	if err = a.Save(ctx, "a", "UA", posters); err != nil {
		t.Fatal(err)
	}
	rows, err := b.List(ctx)
	if err != nil || len(rows["UA"].Posters) != 1 {
		t.Fatalf("persisted data unavailable: %v", err)
	}
	row := rows["UA"]
	if row.RefreshedAt == nil || row.NextRefreshAt.Sub(*row.RefreshedAt) < 28*24*time.Hour || row.NextRefreshAt.Sub(*row.RefreshedAt) > 32*24*time.Hour {
		t.Fatal("refresh is not monthly")
	}
	if err = a.Defer(ctx, "a", "UA"); err != nil {
		t.Fatal(err)
	}
	rows, _ = b.List(ctx)
	if len(rows["UA"].Posters) != 1 || rows["UA"].NextRefreshAt.Sub(time.Now()) > 7*time.Hour {
		t.Fatal("failure erased snapshot or ignored backoff")
	}
	if err = b.Save(ctx, "wrong-owner", "UA", nil); err == nil {
		t.Fatal("stale worker overwrote catalog")
	}
	if err = a.Release(ctx, "a"); err != nil {
		t.Fatal(err)
	}
	if ok, err := b.Acquire(ctx, "b"); err != nil || !ok {
		t.Fatal("released lease stayed locked")
	}
	if err = a.Save(ctx, "a", "UA", nil); err == nil {
		t.Fatal("former owner wrote after handoff")
	}
	if err = b.Save(ctx, "b", "AQ", []Poster{}); err != nil {
		t.Fatal(err)
	}
	rows, _ = a.List(ctx)
	if _, ok := rows["AQ"]; !ok {
		t.Fatal("empty country was not remembered")
	}
}
