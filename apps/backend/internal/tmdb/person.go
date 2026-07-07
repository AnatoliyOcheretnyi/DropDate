package tmdb

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"strings"
)

// personProfileBaseURL is a larger profile size used for the person hero photo.
const personProfileBaseURL = "https://image.tmdb.org/t/p/w342"

// maxPersonCredits caps how many filmography entries we surface across all roles
// to keep the payload sane for very prolific people.
const maxPersonCredits = 120

// PersonInfo mirrors a TMDB person enriched with their combined filmography.
type PersonInfo struct {
	ID                 int
	Name               string
	Biography          string
	KnownForDepartment string
	Birthday           string
	Deathday           string
	PlaceOfBirth       string
	ProfileURL         string
	Homepage           string
	IMDbID             string
	Instagram          string
	Twitter            string
	Popularity         float64
	Credits            []PersonCredit
}

// PersonCredit is one filmography entry, normalised to a single role so the UI
// can group by "as actor" / "as director" / "as writer".
type PersonCredit struct {
	TMDBID      int
	MediaType   string
	Title       string
	Role        string // actor | director | writer
	Character   string
	Job         string
	Year        string
	ReleaseDate string
	PosterURL   string
	VoteAverage float64
	Popularity  float64
}

// PersonByID fetches a person plus their combined credits. Biography is fetched
// in Ukrainian; when TMDB has no localised bio it falls back to English so the
// page is not left blank.
func (c *Client) PersonByID(ctx context.Context, id int) (PersonInfo, error) {
	payload, err := c.fetchPerson(ctx, id, "uk-UA")
	if err != nil {
		return PersonInfo{}, err
	}

	if strings.TrimSpace(payload.Biography) == "" {
		if fallback, err := c.fetchPerson(ctx, id, "en-US"); err == nil {
			payload.Biography = fallback.Biography
		}
	}

	return mapPerson(payload), nil
}

func (c *Client) fetchPerson(ctx context.Context, id int, language string) (personDetailsResponse, error) {
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		fmt.Sprintf("%s/person/%d", c.baseURL, id),
		nil,
	)
	if err != nil {
		return personDetailsResponse{}, err
	}

	q := req.URL.Query()
	q.Set("language", language)
	q.Set("append_to_response", "combined_credits,external_ids")
	req.URL.RawQuery = q.Encode()

	var payload personDetailsResponse
	if err := c.do(req, &payload); err != nil {
		return personDetailsResponse{}, err
	}
	return payload, nil
}

func mapPerson(payload personDetailsResponse) PersonInfo {
	info := PersonInfo{
		ID:                 payload.ID,
		Name:               payload.Name,
		Biography:          strings.TrimSpace(payload.Biography),
		KnownForDepartment: payload.KnownForDepartment,
		Birthday:           payload.Birthday,
		Deathday:           payload.Deathday,
		PlaceOfBirth:       payload.PlaceOfBirth,
		ProfileURL:         buildPersonProfileURL(payload.ProfilePath),
		Homepage:           payload.Homepage,
		Popularity:         payload.Popularity,
	}
	if payload.ExternalIDs != nil {
		info.IMDbID = payload.ExternalIDs.IMDbID
		info.Instagram = payload.ExternalIDs.Instagram
		info.Twitter = payload.ExternalIDs.Twitter
	}
	info.Credits = mapPersonCredits(payload.CombinedCredits)
	return info
}

// mapPersonCredits flattens cast + crew credits into a single deduplicated list.
// A person can hold several jobs on one title (e.g. director + writer); we keep
// one entry per (title, role) so each shows up under the right section only.
func mapPersonCredits(credits *personCombinedCredits) []PersonCredit {
	if credits == nil {
		return nil
	}

	out := make([]PersonCredit, 0, len(credits.Cast)+len(credits.Crew))
	seen := make(map[string]bool)

	add := func(entry PersonCredit) {
		if entry.Title == "" || entry.Role == "" {
			return
		}
		key := fmt.Sprintf("%s:%d:%s", entry.MediaType, entry.TMDBID, entry.Role)
		if seen[key] {
			return
		}
		seen[key] = true
		out = append(out, entry)
	}

	for _, c := range credits.Cast {
		add(personCreditFrom(c.personCreditCommon, "actor", c.Character, ""))
	}
	for _, c := range credits.Crew {
		role := roleFromJob(c.Job, c.Department)
		if role == "" {
			continue
		}
		add(personCreditFrom(c.personCreditCommon, role, "", c.Job))
	}

	// Most-recent, most-popular first — the strongest signal of relevance.
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Year != out[j].Year {
			return out[i].Year > out[j].Year
		}
		return out[i].Popularity > out[j].Popularity
	})

	if len(out) > maxPersonCredits {
		out = out[:maxPersonCredits]
	}
	return out
}

func personCreditFrom(common personCreditCommon, role, character, job string) PersonCredit {
	mediaType := common.MediaType
	title := common.Title
	date := common.ReleaseDate
	if mediaType == "tv" {
		if title == "" {
			title = common.Name
		}
		if date == "" {
			date = common.FirstAirDate
		}
	}
	return PersonCredit{
		TMDBID:      common.ID,
		MediaType:   mediaType,
		Title:       title,
		Role:        role,
		Character:   character,
		Job:         job,
		Year:        yearFromDate(date),
		ReleaseDate: date,
		PosterURL:   buildPosterURL(common.PosterPath),
		VoteAverage: common.VoteAverage,
		Popularity:  common.Popularity,
	}
}

// roleFromJob narrows the many crew jobs down to the roles we surface.
func roleFromJob(job, department string) string {
	switch job {
	case "Director":
		return "director"
	case "Writer", "Screenplay", "Story", "Author":
		return "writer"
	}
	// Series creators arrive via the Writing department without a Director job.
	if department == "Directing" {
		return "director"
	}
	return ""
}

func buildPersonProfileURL(path string) string {
	if path == "" {
		return ""
	}
	return fmt.Sprintf("%s%s", personProfileBaseURL, path)
}

type personDetailsResponse struct {
	ID                 int                    `json:"id"`
	Name               string                 `json:"name"`
	Biography          string                 `json:"biography"`
	KnownForDepartment string                 `json:"known_for_department"`
	Birthday           string                 `json:"birthday"`
	Deathday           string                 `json:"deathday"`
	PlaceOfBirth       string                 `json:"place_of_birth"`
	ProfilePath        string                 `json:"profile_path"`
	Homepage           string                 `json:"homepage"`
	Popularity         float64                `json:"popularity"`
	ExternalIDs        *personExternalIDs     `json:"external_ids"`
	CombinedCredits    *personCombinedCredits `json:"combined_credits"`
}

type personExternalIDs struct {
	IMDbID    string `json:"imdb_id"`
	Instagram string `json:"instagram_id"`
	Twitter   string `json:"twitter_id"`
}

type personCombinedCredits struct {
	Cast []personCastCredit `json:"cast"`
	Crew []personCrewCredit `json:"crew"`
}

type personCreditCommon struct {
	ID           int     `json:"id"`
	MediaType    string  `json:"media_type"`
	Title        string  `json:"title"`
	Name         string  `json:"name"`
	ReleaseDate  string  `json:"release_date"`
	FirstAirDate string  `json:"first_air_date"`
	PosterPath   string  `json:"poster_path"`
	VoteAverage  float64 `json:"vote_average"`
	Popularity   float64 `json:"popularity"`
}

type personCastCredit struct {
	personCreditCommon
	Character string `json:"character"`
}

type personCrewCredit struct {
	personCreditCommon
	Job        string `json:"job"`
	Department string `json:"department"`
}
