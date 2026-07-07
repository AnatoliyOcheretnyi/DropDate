package release

import (
	"context"
	"errors"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/tmdb"
)

// Person is a director/actor profile enriched with their filmography.
type Person struct {
	ID                 int            `json:"id"`
	Name               string         `json:"name"`
	Biography          string         `json:"biography,omitempty"`
	KnownForDepartment string         `json:"knownForDepartment,omitempty"`
	Birthday           string         `json:"birthday,omitempty"`
	Deathday           string         `json:"deathday,omitempty"`
	PlaceOfBirth       string         `json:"placeOfBirth,omitempty"`
	ProfileURL         string         `json:"profileUrl,omitempty"`
	Homepage           string         `json:"homepage,omitempty"`
	IMDbID             string         `json:"imdbId,omitempty"`
	Instagram          string         `json:"instagram,omitempty"`
	Twitter            string         `json:"twitter,omitempty"`
	Popularity         float64        `json:"popularity,omitempty"`
	Credits            []PersonCredit `json:"credits,omitempty"`
}

// PersonCredit is one filmography entry normalised to a single role.
type PersonCredit struct {
	TMDBID      int     `json:"tmdbId"`
	MediaType   string  `json:"mediaType"`
	Title       string  `json:"title"`
	Role        string  `json:"role"`
	Character   string  `json:"character,omitempty"`
	Job         string  `json:"job,omitempty"`
	Year        string  `json:"year,omitempty"`
	ReleaseDate string  `json:"releaseDate,omitempty"`
	PosterURL   string  `json:"posterUrl,omitempty"`
	VoteAverage float64 `json:"voteAverage,omitempty"`
	Popularity  float64 `json:"popularity,omitempty"`
}

// PersonProvider resolves a TMDB person by id.
type PersonProvider interface {
	Person(ctx context.Context, id int) (Person, error)
}

// Person returns a person profile with filmography, or ErrNotFound.
func (s *Service) Person(ctx context.Context, id int) (Person, error) {
	if s.person == nil {
		return Person{}, ErrNotFound
	}
	return s.person.Person(ctx, id)
}

func (p *tmdbSuggestionProvider) Person(ctx context.Context, id int) (Person, error) {
	info, err := p.client.PersonByID(ctx, id)
	if err != nil {
		if errors.Is(err, tmdb.ErrNotFound) {
			return Person{}, ErrNotFound
		}
		return Person{}, err
	}

	credits := make([]PersonCredit, 0, len(info.Credits))
	for _, credit := range info.Credits {
		if credit.MediaType != "movie" && credit.MediaType != "tv" {
			continue
		}
		credits = append(credits, PersonCredit{
			TMDBID:      credit.TMDBID,
			MediaType:   credit.MediaType,
			Title:       credit.Title,
			Role:        credit.Role,
			Character:   credit.Character,
			Job:         credit.Job,
			Year:        credit.Year,
			ReleaseDate: credit.ReleaseDate,
			PosterURL:   credit.PosterURL,
			VoteAverage: credit.VoteAverage,
			Popularity:  credit.Popularity,
		})
	}

	return Person{
		ID:                 info.ID,
		Name:               info.Name,
		Biography:          info.Biography,
		KnownForDepartment: info.KnownForDepartment,
		Birthday:           info.Birthday,
		Deathday:           info.Deathday,
		PlaceOfBirth:       info.PlaceOfBirth,
		ProfileURL:         info.ProfileURL,
		Homepage:           info.Homepage,
		IMDbID:             info.IMDbID,
		Instagram:          info.Instagram,
		Twitter:            info.Twitter,
		Popularity:         info.Popularity,
		Credits:            credits,
	}, nil
}
