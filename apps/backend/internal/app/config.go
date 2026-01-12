package app

import (
	"fmt"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/config"
)

type Config struct {
	HTTP          HTTPConfig
	HTTPClient    HTTPClientConfig
	Shutdown      ShutdownConfig
	Readiness     ReadinessConfig
	TMDB          TMDBConfig
	Database      DatabaseConfig
	Auth          AuthConfig
	Notifications NotificationsConfig
}

type HTTPConfig struct {
	Addr              string
	ReadHeaderTimeout time.Duration
	ReadTimeout       time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
}

type HTTPClientConfig struct {
	Timeout time.Duration
}

type ShutdownConfig struct {
	Timeout time.Duration
}

type ReadinessConfig struct {
	Timeout time.Duration
}

type TMDBConfig struct {
	Token string
}

type DatabaseConfig struct {
	DSN string
}

type AuthConfig struct {
	JWTSecret    string
	Issuer       string
	AccessTTL    time.Duration
	RefreshTTL   time.Duration
	CookieName   string
	CookieSecure bool
}

type NotificationsConfig struct {
	Interval time.Duration
}

func LoadConfig() (Config, error) {
	cfg := Config{
		HTTP: HTTPConfig{
			Addr:              config.String("HTTP_ADDR", ":8080"),
			ReadHeaderTimeout: config.Duration("HTTP_READ_HEADER_TIMEOUT", 5*time.Second),
			ReadTimeout:       config.Duration("HTTP_READ_TIMEOUT", 15*time.Second),
			WriteTimeout:      config.Duration("HTTP_WRITE_TIMEOUT", 15*time.Second),
			IdleTimeout:       config.Duration("HTTP_IDLE_TIMEOUT", 60*time.Second),
		},
		HTTPClient: HTTPClientConfig{
			Timeout: config.Duration("HTTP_CLIENT_TIMEOUT", 5*time.Second),
		},
		Shutdown: ShutdownConfig{
			Timeout: config.Duration("HTTP_SHUTDOWN_TIMEOUT", 5*time.Second),
		},
		Readiness: ReadinessConfig{
			Timeout: config.Duration("HTTP_READINESS_TIMEOUT", 2*time.Second),
		},
		TMDB: TMDBConfig{
			Token: config.String("TMDB_ACCESS_TOKEN", ""),
		},
		Database: DatabaseConfig{
			DSN: config.String("SUPABASE_CONNECTION_STRING", ""),
		},
		Notifications: NotificationsConfig{
			Interval: config.Duration("NOTIFICATIONS_JOB_INTERVAL", 24*time.Hour),
		},
	}

	// Auth settings are only required when the database is enabled.
	if cfg.Database.DSN != "" {
		cfg.Auth = AuthConfig{
			JWTSecret:    config.String("AUTH_JWT_SECRET", ""),
			Issuer:       config.String("AUTH_JWT_ISSUER", "dropdate"),
			AccessTTL:    config.Duration("AUTH_ACCESS_TTL", 15*time.Minute),
			RefreshTTL:   config.Duration("AUTH_REFRESH_TTL", 30*24*time.Hour),
			CookieName:   config.String("AUTH_COOKIE_NAME", "dd_refresh"),
			CookieSecure: config.Bool("AUTH_COOKIE_SECURE", false),
		}

		if cfg.Auth.JWTSecret == "" {
			return Config{}, fmt.Errorf("AUTH_JWT_SECRET is required when database is configured")
		}
	}

	return cfg, nil
}
