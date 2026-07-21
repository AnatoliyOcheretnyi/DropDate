package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
)

func (s *Server) episodesHandler(w http.ResponseWriter, r *http.Request) {
	uid, e := s.requireUserID(r)
	if e != nil {
		writeError(w, 401, "unauthorized")
		return
	}
	if s.episodes == nil {
		writeError(w, 503, "episodes unavailable")
		return
	}
	if r.Method == http.MethodGet {
		id, _ := strconv.Atoi(r.URL.Query().Get("tmdbId"))
		items, e := s.episodes.List(r.Context(), uid, id)
		if e != nil {
			writeError(w, 500, "progress failed")
			return
		}
		writeJSON(w, 200, map[string]any{"items": items})
		return
	}
	if r.Method == http.MethodPost {
		var in struct {
			TMDBID, SeasonNumber, EpisodeNumber, EpisodeCount int
			Watched                                           bool
			Rating                                            *int
		}
		if json.NewDecoder(r.Body).Decode(&in) != nil || in.TMDBID <= 0 || in.SeasonNumber < 0 {
			writeError(w, 400, "invalid progress")
			return
		}
		if in.Rating != nil {
			e = s.episodes.Rate(r.Context(), uid, in.TMDBID, in.SeasonNumber, in.EpisodeNumber, in.Rating)
		} else if in.EpisodeCount > 0 {
			e = s.episodes.SetSeason(r.Context(), uid, in.TMDBID, in.SeasonNumber, in.EpisodeCount, in.Watched)
		} else {
			e = s.episodes.Set(r.Context(), uid, in.TMDBID, in.SeasonNumber, in.EpisodeNumber, in.Watched)
		}
		if e != nil {
			writeError(w, 500, "update failed")
			return
		}
		writeJSON(w, 200, map[string]string{"status": "updated"})
		return
	}
	methodNotAllowed(w)
}
func (s *Server) episodesContinueHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	uid, e := s.requireUserID(r)
	if e != nil {
		writeError(w, 401, "unauthorized")
		return
	}
	items, e := s.episodes.Continue(r.Context(), uid)
	if e != nil {
		writeError(w, 500, "continue failed")
		return
	}
	writeJSON(w, 200, map[string]any{"items": items})
}

func (s *Server) episodesMetadataHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	if _, err := s.requireUserID(r); err != nil {
		writeError(w, 401, "unauthorized")
		return
	}
	tmdbID, _ := strconv.Atoi(r.URL.Query().Get("tmdbId"))
	season, _ := strconv.Atoi(r.URL.Query().Get("season"))
	if tmdbID <= 0 || season < 0 {
		writeError(w, 400, "invalid season")
		return
	}
	items, err := s.releases.SeasonEpisodes(r.Context(), tmdbID, season)
	if err != nil {
		s.logger.Printf("season metadata failed: %v", err)
		writeError(w, 502, "metadata failed")
		return
	}
	writeJSON(w, 200, map[string]any{"items": items})
}
