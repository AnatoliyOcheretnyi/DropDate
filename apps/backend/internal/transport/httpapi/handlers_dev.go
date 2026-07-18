package httpapi

import "net/http"

type devCacheResetResponse struct {
	Status  string   `json:"status"`
	Cleared []string `json:"cleared"`
}

func (s *Server) devCacheResetHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}

	user, err := s.requireSuperuser(r)
	if err != nil {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}

	cleared := make([]string, 0, 2)
	if s.releases != nil {
		s.releases.ClearCache()
		cleared = append(cleared, "releases")
	}
	if s.recommendations != nil {
		s.recommendations.ClearCache()
		cleared = append(cleared, "recommendations")
	}

	s.logger.Printf("dev cache reset by %s (%s)", user.ID, user.Email)
	writeJSON(w, http.StatusOK, devCacheResetResponse{
		Status:  "ok",
		Cleared: cleared,
	})
}
