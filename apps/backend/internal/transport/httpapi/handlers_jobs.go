package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/notifications"
)

const jobsTokenEnvVar = "JOBS_ACCESS_TOKEN"

func (s *Server) notificationsJobHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := strings.TrimSpace(os.Getenv(jobsTokenEnvVar))
	if token != "" {
		authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") || strings.TrimSpace(parts[1]) != token {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
	}

	if s.notifications == nil || s.saved == nil || s.releases == nil {
		http.Error(w, "storage unavailable", http.StatusServiceUnavailable)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Minute)
	defer cancel()

	notifier := notifications.NewReleaseNotifier(s.releases, s.saved, s.notifications, s.logger)
	notifier.RunOnce(ctx)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
