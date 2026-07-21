package httpapi

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type RateLimitConfig struct {
	GeneralPerMinute   int
	AuthPerMinute      int
	ExpensivePerMinute int
}

type rateLimitWindow struct {
	started time.Time
	count   int
}

type rateLimiter struct {
	mu          sync.Mutex
	config      RateLimitConfig
	windows     map[string]rateLimitWindow
	lastCleanup time.Time
}

func newRateLimiter(config RateLimitConfig) *rateLimiter {
	return &rateLimiter{config: config, windows: make(map[string]rateLimitWindow)}
}

func (l *rateLimiter) allow(key string, limit int, now time.Time) bool {
	if l == nil || limit <= 0 {
		return true
	}
	l.mu.Lock()
	defer l.mu.Unlock()

	if l.lastCleanup.IsZero() || now.Sub(l.lastCleanup) >= 10*time.Minute {
		for candidate, window := range l.windows {
			if now.Sub(window.started) >= time.Minute {
				delete(l.windows, candidate)
			}
		}
		l.lastCleanup = now
	}

	window := l.windows[key]
	if window.started.IsZero() || now.Sub(window.started) >= time.Minute {
		l.windows[key] = rateLimitWindow{started: now, count: 1}
		return true
	}
	if window.count >= limit {
		return false
	}
	window.count++
	l.windows[key] = window
	return true
}

func (l *rateLimiter) policy(path string) (string, int) {
	switch {
	case strings.HasPrefix(path, "/auth/"):
		return "auth", l.config.AuthPerMinute
	case strings.HasPrefix(path, "/jobs/"),
		strings.HasPrefix(path, "/recommendations/"),
		strings.HasPrefix(path, "/mood/"),
		strings.HasPrefix(path, "/match/"),
		strings.HasPrefix(path, "/akinator/"):
		return "expensive", l.config.ExpensivePerMinute
	default:
		return "general", l.config.GeneralPerMinute
	}
}

func clientAddress(r *http.Request) string {
	if value := strings.TrimSpace(r.Header.Get("X-Real-IP")); value != "" {
		return value
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil && host != "" {
		return host
	}
	return r.RemoteAddr
}
