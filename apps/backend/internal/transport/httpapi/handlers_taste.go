package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/saved"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/taste"
)

func (s *Server) tasteHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.taste == nil {
		writeError(w, http.StatusServiceUnavailable, "taste unavailable")
		return
	}
	kind := strings.TrimSpace(r.URL.Query().Get("kind"))
	switch r.Method {
	case http.MethodGet:
		items, err := s.taste.Rankings(r.Context(), userID, kind)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": items})
	case http.MethodPost:
		var input struct {
			Left   string `json:"left"`
			Right  string `json:"right"`
			Winner string `json:"winner"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		if err := s.taste.Compare(r.Context(), userID, kind, input.Left, input.Right, input.Winner); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		pair, err := s.taste.NextPair(r.Context(), userID, kind)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, pair)
	default:
		methodNotAllowed(w)
	}
}

func (s *Server) tasteNextHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.taste == nil {
		writeError(w, http.StatusServiceUnavailable, "taste unavailable")
		return
	}
	pair, err := s.taste.NextPair(r.Context(), userID, strings.TrimSpace(r.URL.Query().Get("kind")))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, pair)
}

func (s *Server) tasteOnboardingHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := s.requireUserID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if s.taste == nil {
		writeError(w, http.StatusServiceUnavailable, "taste unavailable")
		return
	}
	switch r.Method {
	case http.MethodGet:
		status, err := s.taste.OnboardingStatus(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "status failed")
			return
		}
		if status.Stage == "titles" && s.recommendations != nil {
			if result, recErr := s.recommendations.Generate(r.Context(), userID, 24); recErr == nil {
				status.Titles = make([]taste.TitleFeedback, 0, len(result.Items))
				for _, item := range result.Items {
					status.Titles = append(status.Titles, taste.TitleFeedback{
						TMDBID:    item.TMDBID,
						MediaType: item.MediaType,
						Title:     item.Title,
						PosterURL: item.PosterURL,
						Year:      item.Year,
					})
				}
			}
		}
		writeJSON(w, http.StatusOK, status)
	case http.MethodPost:
		var input struct {
			Action    string `json:"action"`
			Days      int    `json:"days"`
			TMDBID    int    `json:"tmdbId"`
			MediaType string `json:"mediaType"`
			Title     string `json:"title"`
			PosterURL string `json:"posterUrl"`
			Year      string `json:"year"`
			Sentiment string `json:"sentiment"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		switch strings.TrimSpace(input.Action) {
		case "complete":
			if err := s.taste.CompleteOnboarding(r.Context(), userID); err != nil {
				writeError(w, http.StatusInternalServerError, "completion failed")
				return
			}
		case "snooze":
			days := input.Days
			if days <= 0 {
				days = 1
			}
			if err := s.taste.SnoozeOnboarding(r.Context(), userID, time.Now().Add(time.Duration(days)*24*time.Hour)); err != nil {
				writeError(w, http.StatusInternalServerError, "snooze failed")
				return
			}
		case "feedback":
			feedback := taste.TitleFeedback{
				TMDBID:    input.TMDBID,
				MediaType: strings.TrimSpace(input.MediaType),
				Title:     strings.TrimSpace(input.Title),
				PosterURL: strings.TrimSpace(input.PosterURL),
				Year:      strings.TrimSpace(input.Year),
				Sentiment: strings.TrimSpace(input.Sentiment),
			}
			if err := s.taste.RecordTitleFeedback(r.Context(), userID, feedback); err != nil {
				writeError(w, http.StatusBadRequest, err.Error())
				return
			}
			if s.saved != nil {
				if _, err := s.saved.Upsert(r.Context(), saved.UpsertInput{
					UserID:    userID,
					TMDBID:    feedback.TMDBID,
					MediaType: feedback.MediaType,
					Title:     feedback.Title,
					Status:    "released",
					PosterURL: feedback.PosterURL,
					ListType:  feedback.Sentiment,
				}); err != nil {
					writeError(w, http.StatusInternalServerError, "feedback persist failed")
					return
				}
			}
			s.invalidateRecommendations(userID)
		default:
			writeError(w, http.StatusBadRequest, "invalid action")
			return
		}
		status, err := s.taste.OnboardingStatus(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "status failed")
			return
		}
		writeJSON(w, http.StatusOK, status)
	default:
		methodNotAllowed(w)
	}
}
