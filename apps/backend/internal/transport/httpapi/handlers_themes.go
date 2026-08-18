package httpapi

import (
	"net/http"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/themes"
)

// themesHandler serves the full thematic catalog, grouped for display. It is
// static curated data (no TMDB call, no auth), and backs any surface that wants
// to browse by theme rather than walk a picker flow.
func (s *Server) themesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	writeJSON(w, http.StatusOK, themes.FullCatalog())
}
