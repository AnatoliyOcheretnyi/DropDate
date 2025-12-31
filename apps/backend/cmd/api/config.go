package main

import (
	"bufio"
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/auth"
	_ "github.com/jackc/pgx/v5/stdlib"
)

const supabaseConnEnvVar = "SUPABASE_CONNECTION_STRING"

func openDatabase() *sql.DB {
	dsn := strings.TrimSpace(os.Getenv(supabaseConnEnvVar))
	if dsn == "" {
		log.Printf("%s not set, auth endpoints are disabled", supabaseConnEnvVar)
		return nil
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Printf("failed to open database: %v", err)
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		log.Printf("db ping failed: %v", err)
		_ = db.Close()
		return nil
	}

	return db
}

func buildAuthService(db *sql.DB) (*auth.Service, error) {
	secret := strings.TrimSpace(os.Getenv("AUTH_JWT_SECRET"))
	if secret == "" {
		return nil, fmt.Errorf("AUTH_JWT_SECRET is required")
	}
	issuer := strings.TrimSpace(os.Getenv("AUTH_JWT_ISSUER"))
	if issuer == "" {
		issuer = "dropdate"
	}
	accessTTL := parseDurationEnv("AUTH_ACCESS_TTL", 15*time.Minute)
	refreshTTL := parseDurationEnv("AUTH_REFRESH_TTL", 30*24*time.Hour)
	cookieName := strings.TrimSpace(os.Getenv("AUTH_COOKIE_NAME"))
	if cookieName == "" {
		cookieName = "dd_refresh"
	}
	cookieSecure := strings.EqualFold(strings.TrimSpace(os.Getenv("AUTH_COOKIE_SECURE")), "true")

	return auth.NewService(db, auth.Config{
		JWTSecret:    []byte(secret),
		Issuer:       issuer,
		AccessTTL:    accessTTL,
		RefreshTTL:   refreshTTL,
		CookieName:   cookieName,
		CookieSecure: cookieSecure,
	}), nil
}

func parseDurationEnv(key string, fallback time.Duration) time.Duration {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	if parsed, err := time.ParseDuration(raw); err == nil {
		return parsed
	}
	return fallback
}

func loadEnvFiles(paths ...string) {
	for _, path := range paths {
		file, err := os.Open(path)
		if err != nil {
			continue
		}

		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}

			parts := strings.SplitN(line, "=", 2)
			if len(parts) != 2 {
				continue
			}

			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])

			if key == "" {
				continue
			}
			if _, exists := os.LookupEnv(key); exists {
				continue
			}
			if err := os.Setenv(key, value); err != nil {
				log.Printf("failed to set env %s from %s: %v", key, path, err)
			}
		}

		if err := scanner.Err(); err != nil {
			log.Printf("error reading %s: %v", path, err)
		}

		_ = file.Close()
	}
}
