package httpapi

import (
	"context"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/notifications"
)

const jobsTokenEnvVar = "JOBS_ACCESS_TOKEN"

func (s *Server) notificationsJobHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}

	token := strings.TrimSpace(os.Getenv(jobsTokenEnvVar))
	if token != "" {
		authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") || strings.TrimSpace(parts[1]) != token {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
	}

	if s.notifications == nil || s.saved == nil || s.releases == nil {
		writeError(w, http.StatusServiceUnavailable, "storage unavailable")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Minute)
	defer cancel()

	notifier := notifications.NewReleaseNotifier(s.releases, s.saved, s.notifications, s.logger)
	notifier.RunOnce(ctx)

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
