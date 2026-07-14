package httpapi

import "net/http"

func (s *Server) achievementsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.achievements == nil {
		writeError(w, http.StatusServiceUnavailable, "storage unavailable")
		return
	}

	progress, err := s.achievements.Snapshot(r.Context(), userID)
	if err != nil {
		s.logger.Printf("achievements snapshot failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch achievements")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"lists": progress})
}
