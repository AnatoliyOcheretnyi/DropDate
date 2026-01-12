package main

import (
	"database/sql"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/config"
	_ "github.com/jackc/pgx/v5/stdlib"
)

const migrationsDir = "./migrations"

func main() {
	config.LoadEnvFiles(".env", ".env.local")
	dsn := strings.TrimSpace(os.Getenv("SUPABASE_CONNECTION_STRING"))
	if dsn == "" {
		log.Fatal("SUPABASE_CONNECTION_STRING is required")
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("db open failed: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("db ping failed: %v", err)
	}

	if err := ensureMigrationsTable(db); err != nil {
		log.Fatalf("ensure migrations table failed: %v", err)
	}

	files, err := readMigrationFiles(migrationsDir)
	if err != nil {
		log.Fatalf("read migrations failed: %v", err)
	}

	applied, err := loadApplied(db)
	if err != nil {
		log.Fatalf("load applied failed: %v", err)
	}

	for _, file := range files {
		if applied[file] {
			continue
		}

		if err := applyMigration(db, filepath.Join(migrationsDir, file), file); err != nil {
			log.Fatalf("apply %s failed: %v", file, err)
		}
		log.Printf("applied %s", file)
	}

	log.Printf("migrations complete")
}

func ensureMigrationsTable(db *sql.DB) error {
	_, err := db.Exec(`
		create table if not exists schema_migrations (
			version text primary key,
			applied_at timestamptz not null default now()
		);
	`)
	return err
}

func readMigrationFiles(dir string) ([]string, error) {
	entries := make([]string, 0)
	err := filepath.WalkDir(dir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		if strings.HasSuffix(d.Name(), ".sql") {
			entries = append(entries, d.Name())
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	sort.Strings(entries)
	return entries, nil
}

func loadApplied(db *sql.DB) (map[string]bool, error) {
	rows, err := db.Query(`select version from schema_migrations`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	applied := make(map[string]bool)
	for rows.Next() {
		var version string
		if err := rows.Scan(&version); err != nil {
			return nil, err
		}
		applied[version] = true
	}
	return applied, rows.Err()
}

func applyMigration(db *sql.DB, path string, version string) error {
	raw, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(string(raw)); err != nil {
		return fmt.Errorf("exec: %w", err)
	}
	if _, err := tx.Exec(`insert into schema_migrations (version) values ($1)`, version); err != nil {
		return fmt.Errorf("record version: %w", err)
	}

	return tx.Commit()
}
