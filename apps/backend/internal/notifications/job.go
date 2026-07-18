package notifications

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/people"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/saved"
)

type ReleaseNotifier struct {
	releases *release.Service
	saved    *saved.Service
	events   *Service
	people   *people.Service
	logger   *log.Logger
}

func NewReleaseNotifier(
	releases *release.Service,
	savedSvc *saved.Service,
	events *Service,
	peopleSvc *people.Service,
	logger *log.Logger,
) *ReleaseNotifier {
	if logger == nil {
		logger = log.Default()
	}
	return &ReleaseNotifier{
		releases: releases,
		saved:    savedSvc,
		events:   events,
		people:   peopleSvc,
		logger:   logger,
	}
}

func (n *ReleaseNotifier) Run(ctx context.Context, interval time.Duration) {
	if interval <= 0 {
		return
	}
	n.logger.Printf("notifications job start (interval=%s)", interval)
	n.runOnce(ctx)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			n.logger.Printf("notifications job tick")
			n.runOnce(ctx)
		case <-ctx.Done():
			n.logger.Printf("notifications job stopped: %v", ctx.Err())
			return
		}
	}
}

func (n *ReleaseNotifier) RunOnce(ctx context.Context) {
	n.logger.Printf("notifications job manual trigger")
	n.runOnce(ctx)
}

func (n *ReleaseNotifier) runOnce(ctx context.Context) {
	if n.releases == nil || n.events == nil {
		n.logger.Printf("notifications job skipped: missing dependencies")
		return
	}

	items := []saved.FollowItem{}
	var err error
	if n.saved != nil {
		items, err = n.saved.ListFollowSubscriptions(ctx)
	}
	if err != nil {
		n.logger.Printf("notifications: follow list failed: %v", err)
		return
	}

	now := time.Now().UTC()
	cache := make(map[string]release.Details)
	for _, item := range items {
		key := fmt.Sprintf("%d:%s", item.TMDBID, item.MediaType)
		details, ok := cache[key]
		if !ok {
			details, err = n.releases.Details(ctx, item.TMDBID, item.MediaType)
			if err != nil {
				continue
			}
			cache[key] = details
		}

		input, ok := buildNotificationInput(item, details, now)
		if !ok {
			continue
		}
		if _, err := n.events.CreateIfMissing(ctx, input); err != nil {
			n.logger.Printf("notifications: insert failed for %s: %v", key, err)
		}
	}
	n.runPeople(ctx, now)
	n.logger.Printf("notifications job finished: checked=%d", len(items))
}

func (n *ReleaseNotifier) runPeople(ctx context.Context, now time.Time) {
	if n.people == nil {
		return
	}
	follows, err := n.people.Subscriptions(ctx)
	if err != nil {
		n.logger.Printf("notifications: people subscriptions failed: %v", err)
		return
	}
	profiles := make(map[int]release.Person)
	for _, follow := range follows {
		person, ok := profiles[follow.PersonID]
		if !ok {
			person, err = n.releases.Person(ctx, follow.PersonID)
			if err != nil {
				continue
			}
			profiles[follow.PersonID] = person
		}
		for _, credit := range person.Credits {
			if credit.Role != follow.Role || credit.ReleaseDate == "" {
				continue
			}
			releaseDate, err := time.Parse(time.DateOnly, credit.ReleaseDate)
			if err != nil || releaseDate.After(now) || releaseDate.Before(now.AddDate(0, 0, -7)) {
				continue
			}
			_, err = n.events.CreateIfMissing(ctx, CreateInput{
				UserID: follow.UserID, TMDBID: credit.TMDBID, MediaType: credit.MediaType,
				Title: credit.Title, EventType: "person_release",
				EventKey:    fmt.Sprintf("person:%d:%s:%s", follow.PersonID, follow.Role, releaseDate.Format(time.DateOnly)),
				ReleaseDate: &releaseDate, PosterURL: credit.PosterURL,
			})
			if err != nil {
				n.logger.Printf("notifications: person release insert failed: %v", err)
			}
		}
	}
}

func buildNotificationInput(
	item saved.FollowItem,
	details release.Details,
	now time.Time,
) (CreateInput, bool) {
	title := details.Title
	if title == "" {
		title = item.Title
	}
	poster := details.PosterURL
	if poster == "" {
		poster = item.PosterURL
	}
	backdrop := details.BackdropURL
	if backdrop == "" {
		backdrop = item.BackdropURL
	}

	if item.MediaType == "movie" {
		if details.ReleaseDate == "" {
			return CreateInput{}, false
		}
		releaseDate, err := time.Parse("2006-01-02", details.ReleaseDate)
		if err != nil || releaseDate.After(now) {
			return CreateInput{}, false
		}
		return CreateInput{
			UserID:      item.UserID,
			TMDBID:      item.TMDBID,
			MediaType:   item.MediaType,
			Title:       title,
			EventType:   "movie_release",
			EventKey:    fmt.Sprintf("movie:%s", releaseDate.Format("2006-01-02")),
			ReleaseDate: &releaseDate,
			PosterURL:   poster,
			BackdropURL: backdrop,
		}, true
	}

	if details.LastAirDate == "" {
		return CreateInput{}, false
	}
	releaseDate, err := time.Parse("2006-01-02", details.LastAirDate)
	if err != nil || releaseDate.After(now) {
		return CreateInput{}, false
	}

	var eventKey string
	if details.LastEpisodeSeason > 0 && details.LastEpisodeNumber > 0 {
		eventKey = fmt.Sprintf("tv:s%02de%02d", details.LastEpisodeSeason, details.LastEpisodeNumber)
	} else if details.LastEpisode != "" {
		eventKey = fmt.Sprintf("tv:%s:%s", releaseDate.Format("2006-01-02"), details.LastEpisode)
	} else {
		eventKey = fmt.Sprintf("tv:%s", releaseDate.Format("2006-01-02"))
	}

	season := details.LastEpisodeSeason
	episode := details.LastEpisodeNumber
	var seasonPtr *int
	var episodePtr *int
	if season > 0 {
		seasonPtr = &season
	}
	if episode > 0 {
		episodePtr = &episode
	}

	return CreateInput{
		UserID:        item.UserID,
		TMDBID:        item.TMDBID,
		MediaType:     item.MediaType,
		Title:         title,
		EventType:     "episode_release",
		EventKey:      eventKey,
		SeasonNumber:  seasonPtr,
		EpisodeNumber: episodePtr,
		EpisodeName:   details.LastEpisode,
		ReleaseDate:   &releaseDate,
		PosterURL:     poster,
		BackdropURL:   backdrop,
	}, true
}
