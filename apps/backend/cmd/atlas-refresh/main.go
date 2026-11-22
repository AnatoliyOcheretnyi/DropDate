package main

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/atlas"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/config"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/tmdb"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	config.LoadEnvFiles("apps/backend/.env.local", "apps/backend/.env", ".env.local", ".env")
	if os.Getenv("SUPABASE_CONNECTION_STRING") == "" || os.Getenv("TMDB_ACCESS_TOKEN") == "" {
		log.Fatal("SUPABASE_CONNECTION_STRING and TMDB_ACCESS_TOKEN are required")
	}
	db, err := sql.Open("pgx", os.Getenv("SUPABASE_CONNECTION_STRING"))
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	source, err := tmdb.NewClient(&http.Client{Timeout: 8 * time.Second}, os.Getenv("TMDB_ACCESS_TOKEN"))
	if err != nil {
		log.Fatal(err)
	}
	service := atlas.New(atlas.NewStore(db), source, log.Default())
	report, err := service.Refresh(context.Background())
	if errors.Is(err, atlas.ErrBusy) {
		log.Print("Atlas refresh is already running on another process")
		return
	}
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("Atlas: updated=%d skipped=%d failed=%d", report.Updated, report.Skipped, report.Failed)
	if report.Failed > 0 {
		os.Exit(1)
	}
}
