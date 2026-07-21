package app

import (
	"strings"
	"testing"
	"time"
)

func validConfigForTest() Config {
	return Config{
		HTTP:     HTTPConfig{Addr: ":8080", RequestTimeout: 10 * time.Second},
		Shutdown: ShutdownConfig{Timeout: 5 * time.Second},
		Database: DatabaseConfig{
			MaxOpenConns:    10,
			MaxIdleConns:    5,
			ConnMaxLifetime: 30 * time.Minute,
			ConnMaxIdleTime: 5 * time.Minute,
		},
		Security: SecurityConfig{
			MaxBodyBytes:           1 << 20,
			GeneralRatePerMinute:   240,
			AuthRatePerMinute:      20,
			ExpensiveRatePerMinute: 30,
		},
	}
}

func TestConfigRejectsUnsafeLimits(t *testing.T) {
	cfg := validConfigForTest()
	cfg.Security.MaxBodyBytes = 0
	cfg.Database.MaxIdleConns = 11

	err := cfg.Validate()
	if err == nil {
		t.Fatal("expected validation error")
	}
	message := err.Error()
	if !strings.Contains(message, "HTTP_MAX_BODY_BYTES") || !strings.Contains(message, "DB_MAX_IDLE_CONNS") {
		t.Fatalf("unexpected validation error: %v", err)
	}
}

func TestConfigRequiresJWTSecretWithDatabase(t *testing.T) {
	cfg := validConfigForTest()
	cfg.Database.DSN = "postgres://example"

	err := cfg.Validate()
	if err == nil || !strings.Contains(err.Error(), "AUTH_JWT_SECRET") {
		t.Fatalf("expected missing JWT secret error, got %v", err)
	}
}

func TestSplitCommaSeparatedNormalizesAndDropsEmptyValues(t *testing.T) {
	values := splitCommaSeparated(" Admin@Example.com, ,second@example.com ")
	if len(values) != 2 || values[0] != "admin@example.com" || values[1] != "second@example.com" {
		t.Fatalf("unexpected values: %#v", values)
	}
}
