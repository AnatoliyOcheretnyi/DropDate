package tmdb

import (
	"context"
	"fmt"
	"net/http"
)

// NamedRef is a TMDB entity reference (keyword, actor, director).
type NamedRef struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

// MovieFeatureInfo carries the metadata the Akinator dataset needs for one
// movie, fetched in a single request via append_to_response.
type MovieFeatureInfo struct {
	ID               int
	Title            string
	ReleaseDate      string
	PosterURL        string
	BackdropURL      string
	Popularity       float64
	VoteAverage      float64
	VoteCount        int
	Runtime          int
	OriginalLanguage string
	IsFranchise      bool
	OriginCountry    []string
	GenreIDs         []int
	Keywords         []NamedRef
	Cast             []NamedRef
	Directors        []NamedRef
}

const featureCastLimit = 12

type movieFeaturesResponse struct {
	ID               int      `json:"id"`
	Title            string   `json:"title"`
	ReleaseDate      string   `json:"release_date"`
	PosterPath       string   `json:"poster_path"`
	BackdropPath     string   `json:"backdrop_path"`
	Popularity       float64  `json:"popularity"`
	VoteAverage      float64  `json:"vote_average"`
	VoteCount        int      `json:"vote_count"`
	Runtime          int      `json:"runtime"`
	OriginalLanguage string   `json:"original_language"`
	OriginCountry    []string `json:"origin_country"`
	Genres           []struct {
		ID int `json:"id"`
	} `json:"genres"`
	BelongsToCollection *struct {
		ID int `json:"id"`
	} `json:"belongs_to_collection"`
	Keywords struct {
		Keywords []NamedRef `json:"keywords"`
	} `json:"keywords"`
	Credits struct {
		Cast []struct {
			ID    int    `json:"id"`
			Name  string `json:"name"`
			Order int    `json:"order"`
		} `json:"cast"`
		Crew []struct {
			ID   int    `json:"id"`
			Name string `json:"name"`
			Job  string `json:"job"`
		} `json:"crew"`
	} `json:"credits"`
}

// MovieFeatures fetches one movie's Akinator-relevant metadata (keywords,
// credits, collection membership) in a single TMDB call.
func (c *Client) MovieFeatures(ctx context.Context, id int) (MovieFeatureInfo, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fmt.Sprintf("%s/movie/%d", c.baseURL, id), nil)
	if err != nil {
		return MovieFeatureInfo{}, err
	}
	q := req.URL.Query()
	q.Set("language", "uk-UA")
	q.Set("append_to_response", "keywords,credits")
	req.URL.RawQuery = q.Encode()

	var payload movieFeaturesResponse
	if err := c.do(req, &payload); err != nil {
		return MovieFeatureInfo{}, err
	}

	info := MovieFeatureInfo{
		ID:               payload.ID,
		Title:            payload.Title,
		ReleaseDate:      payload.ReleaseDate,
		Popularity:       payload.Popularity,
		VoteAverage:      payload.VoteAverage,
		VoteCount:        payload.VoteCount,
		Runtime:          payload.Runtime,
		OriginalLanguage: payload.OriginalLanguage,
		IsFranchise:      payload.BelongsToCollection != nil,
		OriginCountry:    payload.OriginCountry,
		Keywords:         payload.Keywords.Keywords,
	}
	if payload.PosterPath != "" {
		info.PosterURL = buildPosterURL(payload.PosterPath)
	}
	if payload.BackdropPath != "" {
		info.BackdropURL = buildBackdropURL(payload.BackdropPath)
	}
	for _, genre := range payload.Genres {
		info.GenreIDs = append(info.GenreIDs, genre.ID)
	}
	for _, member := range payload.Credits.Cast {
		if member.Order >= featureCastLimit {
			continue
		}
		info.Cast = append(info.Cast, NamedRef{ID: member.ID, Name: member.Name})
	}
	for _, member := range payload.Credits.Crew {
		if member.Job == "Director" {
			info.Directors = append(info.Directors, NamedRef{ID: member.ID, Name: member.Name})
		}
	}
	return info, nil
}
