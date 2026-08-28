package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/episodes"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
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
	validated := validateContinueItems(r.Context(), s.releases, items, time.Now().UTC())
	writeJSON(w, 200, map[string]any{"items": validated})
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

// seasonFetcher is the slice of the release service the continue rail needs.
type seasonFetcher interface {
	SeasonEpisodes(ctx context.Context, tvID, seasonNumber int) ([]release.Episode, error)
}

// validateContinueItems decides which of the stored "next episode" pointers are
// actually something to watch right now.
//
// Continue() derives the next episode as max(watched)+1, which is a guess: for
// someone who finished a season it points past the end, and TMDB happily lists
// episodes that were announced but have not aired. Both cases used to leave a
// finished series sitting in "Продовжити перегляд" forever. A series drops out
// of the rail when the viewer has caught up, and comes back on its own once the
// next episode airs.
func validateContinueItems(
	ctx context.Context,
	seasons seasonFetcher,
	items []episodes.ContinueItem,
	today time.Time,
) []episodes.ContinueItem {
	validated := items[:0]
	for _, item := range items {
		current, err := seasons.SeasonEpisodes(ctx, item.TMDBID, item.SeasonNumber)
		if err != nil {
			if errors.Is(err, release.ErrNotFound) {
				// The season the progress points at is gone; nothing to continue.
				continue
			}
			// Metadata is an external dependency: on a transient failure keep the
			// item rather than making the whole rail flicker out.
			validated = append(validated, item)
			continue
		}

		item.EpisodeCount = len(current)
		if hasAiredEpisode(current, item.EpisodeNumber, today) {
			validated = append(validated, item)
			continue
		}

		// The season is finished — the next one may already have started.
		next, err := seasons.SeasonEpisodes(ctx, item.TMDBID, item.SeasonNumber+1)
		if err != nil {
			if errors.Is(err, release.ErrNotFound) {
				// No next season: the viewer is done with this series.
				continue
			}
			validated = append(validated, item)
			continue
		}
		if !hasAiredEpisode(next, 1, today) {
			// Announced but not aired yet — the card returns on release day.
			continue
		}

		item.SeasonNumber++
		item.EpisodeNumber = 1
		// Progress belongs to the season being counted, and this item has just
		// rolled over to the next one.
		item.WatchedCount = 0
		item.EpisodeCount = len(next)
		validated = append(validated, item)
	}
	return validated
}

// hasAiredEpisode reports whether the numbered episode exists in the season and
// is already out. An episode without an air date is treated as unreleased:
// TMDB fills the date in once an episode is scheduled, so a blank one is a
// placeholder rather than something the viewer can watch tonight.
func hasAiredEpisode(season []release.Episode, number int, today time.Time) bool {
	for _, episode := range season {
		if episode.EpisodeNumber != number {
			continue
		}
		airDate, err := time.Parse(episodeAirDateLayout, strings.TrimSpace(episode.AirDate))
		if err != nil {
			return false
		}
		return !airDate.After(today)
	}
	return false
}

const episodeAirDateLayout = "2006-01-02"
