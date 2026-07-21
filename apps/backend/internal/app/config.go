package app

import (
	"strings"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/config"
)

type Config struct {
	HTTP            HTTPConfig
	HTTPClient      HTTPClientConfig
	Shutdown        ShutdownConfig
	Readiness       ReadinessConfig
	TMDB            TMDBConfig
	Database        DatabaseConfig
	Auth            AuthConfig
	Notifications   NotificationsConfig
	Email           EmailConfig
	AI              AIConfig
	Recommendations RecommendationsConfig
	Security        SecurityConfig
	Jobs            JobsConfig
}

type SecurityConfig struct {
	MaxBodyBytes           int64
	GeneralRatePerMinute   int
	AuthRatePerMinute      int
	ExpensiveRatePerMinute int
	SuperuserEmails        []string
}

type JobsConfig struct {
	AccessToken string
}

type AIConfig struct {
	GeminiAPIKey string
	GeminiModel  string
	// Per-feature toggles. Effective only when a Gemini key is present; they let
	// you turn individual AI features off without removing the key.
	RecommendationsEnabled bool
	MoodEnabled            bool
	MatchEnabled           bool
}

type RecommendationsConfig struct {
	// RefreshDebounce delays regenerating cached feeds after a saved-list
	// change, so rapid edits don't trigger a model call each time.
	RefreshDebounce time.Duration
}

type HTTPConfig struct {
	Addr              string
	ReadHeaderTimeout time.Duration
	ReadTimeout       time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	RequestTimeout    time.Duration
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
	DSN             string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
}

type AuthConfig struct {
	JWTSecret                  string
	Issuer                     string
	AccessTTL                  time.Duration
	RefreshTTL                 time.Duration
	CookieName                 string
	CookieSecure               bool
	RequireEmailVerification   bool
	VerificationTTL            time.Duration
	VerificationResendCooldown time.Duration
}

type NotificationsConfig struct {
	Interval time.Duration
}

type EmailConfig struct {
	ResendAPIKey  string
	ResendSender  string
	AppBaseURL    string
	VerifyBaseURL string
}

func LoadConfig() (Config, error) {
	cfg := Config{
		HTTP: HTTPConfig{
			Addr:              config.String("HTTP_ADDR", ":8080"),
			ReadHeaderTimeout: config.Duration("HTTP_READ_HEADER_TIMEOUT", 5*time.Second),
			ReadTimeout:       config.Duration("HTTP_READ_TIMEOUT", 15*time.Second),
			WriteTimeout:      config.Duration("HTTP_WRITE_TIMEOUT", 15*time.Second),
			IdleTimeout:       config.Duration("HTTP_IDLE_TIMEOUT", 60*time.Second),
			RequestTimeout:    config.Duration("HTTP_REQUEST_TIMEOUT", 10*time.Second),
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
			DSN:             config.String("SUPABASE_CONNECTION_STRING", ""),
			MaxOpenConns:    config.Int("DB_MAX_OPEN_CONNS", 10),
			MaxIdleConns:    config.Int("DB_MAX_IDLE_CONNS", 5),
			ConnMaxLifetime: config.Duration("DB_CONN_MAX_LIFETIME", 30*time.Minute),
			ConnMaxIdleTime: config.Duration("DB_CONN_MAX_IDLE_TIME", 5*time.Minute),
		},
		Notifications: NotificationsConfig{
			Interval: config.Duration("NOTIFICATIONS_JOB_INTERVAL", 24*time.Hour),
		},
		Email: EmailConfig{
			ResendAPIKey:  config.String("RESEND_API_KEY", ""),
			ResendSender:  config.String("RESEND_SENDER", ""),
			AppBaseURL:    config.String("APP_BASE_URL", ""),
			VerifyBaseURL: config.String("AUTH_VERIFY_BASE_URL", ""),
		},
		AI: AIConfig{
			GeminiAPIKey:           config.String("GEMINI_API_KEY", ""),
			GeminiModel:            config.String("GEMINI_MODEL", ""),
			RecommendationsEnabled: config.Bool("AI_RECOMMENDATIONS_ENABLED", true),
			MoodEnabled:            config.Bool("AI_MOOD_ENABLED", true),
			MatchEnabled:           config.Bool("AI_MATCH_ENABLED", true),
		},
		Recommendations: RecommendationsConfig{
			RefreshDebounce: config.Duration("RECOMMENDATIONS_REFRESH_DEBOUNCE", 5*time.Minute),
		},
		Security: SecurityConfig{
			MaxBodyBytes:           config.Int64("HTTP_MAX_BODY_BYTES", 1<<20),
			GeneralRatePerMinute:   config.Int("HTTP_RATE_LIMIT_PER_MINUTE", 240),
			AuthRatePerMinute:      config.Int("AUTH_RATE_LIMIT_PER_MINUTE", 20),
			ExpensiveRatePerMinute: config.Int("EXPENSIVE_RATE_LIMIT_PER_MINUTE", 30),
			SuperuserEmails:        splitCommaSeparated(config.String("SUPERUSER_EMAILS", "")),
		},
		Jobs: JobsConfig{
			AccessToken: config.String("JOBS_ACCESS_TOKEN", ""),
		},
	}

	// Auth settings are only required when the database is enabled.
	if cfg.Database.DSN != "" {
		cfg.Auth = AuthConfig{
			JWTSecret:                  config.String("AUTH_JWT_SECRET", ""),
			Issuer:                     config.String("AUTH_JWT_ISSUER", "dropdate"),
			AccessTTL:                  config.Duration("AUTH_ACCESS_TTL", 15*time.Minute),
			RefreshTTL:                 config.Duration("AUTH_REFRESH_TTL", 30*24*time.Hour),
			CookieName:                 config.String("AUTH_COOKIE_NAME", "dd_refresh"),
			CookieSecure:               config.Bool("AUTH_COOKIE_SECURE", false),
			RequireEmailVerification:   config.Bool("AUTH_REQUIRE_EMAIL_VERIFICATION", false),
			VerificationTTL:            config.Duration("AUTH_VERIFICATION_TTL", 24*time.Hour),
			VerificationResendCooldown: config.Duration("AUTH_VERIFICATION_RESEND_COOLDOWN", 2*time.Minute),
		}

	}

	if err := cfg.Validate(); err != nil {
		return Config{}, err
	}

	return cfg, nil
}

func splitCommaSeparated(value string) []string {
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if normalized := strings.ToLower(strings.TrimSpace(part)); normalized != "" {
			result = append(result, normalized)
		}
	}
	return result
}

type validationErrors []string

func (v validationErrors) Error() string {
	return "invalid configuration: " + strings.Join(v, "; ")
}

func (c Config) Validate() error {
	var errs validationErrors
	if c.HTTP.Addr == "" {
		errs = append(errs, "HTTP_ADDR is required")
	}
	if c.HTTP.RequestTimeout < 0 {
		errs = append(errs, "HTTP_REQUEST_TIMEOUT must be >= 0")
	}
	if c.Security.MaxBodyBytes <= 0 {
		errs = append(errs, "HTTP_MAX_BODY_BYTES must be > 0")
	}
	if c.Security.GeneralRatePerMinute <= 0 || c.Security.AuthRatePerMinute <= 0 || c.Security.ExpensiveRatePerMinute <= 0 {
		errs = append(errs, "rate limits must be > 0")
	}
	if c.Shutdown.Timeout <= 0 {
		errs = append(errs, "HTTP_SHUTDOWN_TIMEOUT must be > 0")
	}
	if c.Database.DSN != "" && c.Auth.JWTSecret == "" {
		errs = append(errs, "AUTH_JWT_SECRET is required when database is configured")
	}
	if c.Database.MaxOpenConns <= 0 {
		errs = append(errs, "DB_MAX_OPEN_CONNS must be > 0")
	}
	if c.Database.MaxIdleConns < 0 || c.Database.MaxIdleConns > c.Database.MaxOpenConns {
		errs = append(errs, "DB_MAX_IDLE_CONNS must be between 0 and DB_MAX_OPEN_CONNS")
	}
	if c.Database.ConnMaxLifetime <= 0 || c.Database.ConnMaxIdleTime <= 0 {
		errs = append(errs, "database connection lifetimes must be > 0")
	}
	if c.Auth.RequireEmailVerification {
		if c.Email.ResendAPIKey == "" {
			errs = append(errs, "RESEND_API_KEY is required when email verification is enabled")
		}
		if c.Email.ResendSender == "" {
			errs = append(errs, "RESEND_SENDER is required when email verification is enabled")
		}
		if c.Email.VerifyBaseURL == "" && c.Email.AppBaseURL == "" {
			errs = append(errs, "AUTH_VERIFY_BASE_URL or APP_BASE_URL is required when email verification is enabled")
		}
		if c.Auth.VerificationTTL <= 0 {
			errs = append(errs, "AUTH_VERIFICATION_TTL must be > 0 when email verification is enabled")
		}
	}
	if len(errs) == 0 {
		return nil
	}
	return errs
}
