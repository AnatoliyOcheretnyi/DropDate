package httpapi

import (
	"crypto/subtle"
	"net/http"
	"strings"
)

func (s *Server) authorizeJob(r *http.Request) (int, bool) {
	expected := strings.TrimSpace(s.jobsAccessToken)
	if expected == "" {
		return http.StatusServiceUnavailable, false
	}

	scheme, provided, ok := strings.Cut(strings.TrimSpace(r.Header.Get("Authorization")), " ")
	if !ok || !strings.EqualFold(scheme, "bearer") {
		return http.StatusUnauthorized, false
	}
	provided = strings.TrimSpace(provided)
	if len(provided) != len(expected) || subtle.ConstantTimeCompare([]byte(provided), []byte(expected)) != 1 {
		return http.StatusUnauthorized, false
	}
	return 0, true
}
