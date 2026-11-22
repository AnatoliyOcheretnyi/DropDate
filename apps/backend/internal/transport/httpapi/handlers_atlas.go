package httpapi

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
)

func (s *Server) worldAtlasHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	if s.atlas == nil {
		writeError(w, 503, "atlas unavailable")
		return
	}
	catalog, err := s.atlas.Catalog(r.Context())
	if err != nil {
		s.logger.Printf("atlas read: %v", err)
		writeError(w, 503, "atlas unavailable")
		return
	}
	if len(catalog.Countries) == 0 {
		w.Header().Set("Retry-After", "30")
		writeError(w, 503, "atlas is being prepared")
		return
	}
	raw, err := json.Marshal(catalog)
	if err != nil {
		writeError(w, 500, "atlas encoding failed")
		return
	}
	etag := fmt.Sprintf(`"%x"`, sha256.Sum256(raw))
	w.Header().Set("ETag", etag)
	w.Header().Set("Cache-Control", "public, max-age=300, stale-while-revalidate=86400")
	if r.Header.Get("If-None-Match") == etag {
		w.WriteHeader(http.StatusNotModified)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(raw)
}

func (s *Server) worldAtlasJobHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	if status, ok := s.authorizeJob(r); !ok {
		writeError(w, status, http.StatusText(status))
		return
	}
	if s.atlas == nil {
		writeError(w, 503, "atlas unavailable")
		return
	}
	// Work belongs to the application's lifetime, not this HTTP request. This
	// also avoids load-balancer/write deadlines on a full first-time prefill.
	s.atlas.Trigger()
	writeJSON(w, http.StatusAccepted, map[string]string{"status": "queued"})
}
