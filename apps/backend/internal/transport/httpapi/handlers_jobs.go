package httpapi

import (
	"context"
	"net/http"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/notifications"
)

func (s *Server) notificationsJobHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}

	if status, ok := s.authorizeJob(r); !ok {
		writeError(w, status, http.StatusText(status))
		return
	}

	if s.notifications == nil || s.saved == nil || s.releases == nil {
		writeError(w, http.StatusServiceUnavailable, "storage unavailable")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Minute)
	defer cancel()

	notifier := notifications.NewReleaseNotifier(s.releases, s.saved, s.notifications, s.people, s.logger)
	notifier.RunOnce(ctx)

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
