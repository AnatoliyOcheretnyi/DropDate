package tmdb

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/releasestatus"
)

const defaultBaseURL = "https://api.themoviedb.org/3"
const posterBaseURL = "https://image.tmdb.org/t/p/w342"
const backdropBaseURL = "https://image.tmdb.org/t/p/w780"

// Client represents a TMDB HTTP client.
type Client struct {
	baseURL    string
	httpClient *http.Client
	token      string
}

// ReleaseInfo mirrors the data we expose through DropDate.
type ReleaseInfo struct {
	Title       string
	Type        string
	NextRelease time.Time
	Source      string
	PosterURL   string
	BackdropURL string
	Status      string
}

type DetailInfo struct {
	ID                int
	Title             string
	MediaType         string
	Overview          string
	Tagline           string
	PosterURL         string
	BackdropURL       string
	Status            string
	ReleaseDate       string
	FirstAirDate      string
	LastAirDate       string
	NextAirDate       string
	NextEpisode       string
	NextEpisodeSeason int
	NextEpisodeNumber int
	LastEpisode       string
	LastEpisodeSeason int
	LastEpisodeNumber int
	SeasonCount       int
	EpisodeCount      int
	Runtime           int
	Genres            []string
	Networks          []string
	VoteAverage       float64
	VoteCount         int
	Popularity        float64
	Homepage          string
	OriginCountry     []string
}

// Suggestion is a lightweight search result.
type Suggestion struct {
	ID        int
	Title     string
	MediaType string
	Year      string
	PosterURL string
}

// ErrNotFound is returned when TMDB has no relevant item.
var ErrNotFound = errors.New("tmdb: not found")

// NewClient configures the TMDB HTTP client with the provided access token.
func NewClient(httpClient *http.Client, accessToken string) (*Client, error) {
	if accessToken == "" {
		return nil, errors.New("tmdb: access token is required")
	}

	if httpClient == nil {
		httpClient = &http.Client{Timeout: 5 * time.Second}
	}

	return &Client{
		baseURL:    defaultBaseURL,
		httpClient: httpClient,
		token:      accessToken,
	}, nil
}

// NextRelease finds the first TV show or movie that matches the query.
func (c *Client) NextRelease(ctx context.Context, title string) (ReleaseInfo, error) {
	results, err := c.search(ctx, title)
	if err != nil {
		return ReleaseInfo{}, err
	}

	for _, result := range results {
		switch result.MediaType {
		case "tv":
			info, err := c.fetchTV(ctx, result.ID)
			if err != nil {
				if errors.Is(err, ErrNotFound) {
					continue
				}
				return ReleaseInfo{}, err
			}
			return info, nil
		case "movie":
			info, err := c.fetchMovie(ctx, result.ID)
			if err != nil {
				if errors.Is(err, ErrNotFound) {
					continue
				}
				return ReleaseInfo{}, err
			}
			return info, nil
		}
	}

	return ReleaseInfo{}, ErrNotFound
}

// LookupByID повертає реліз за конкретним TMDB ID.
func (c *Client) LookupByID(ctx context.Context, id int, mediaType string) (ReleaseInfo, error) {
	switch mediaType {
	case "movie":
		return c.fetchMovie(ctx, id)
	case "tv":
		return c.fetchTV(ctx, id)
	default:
		if info, err := c.fetchTV(ctx, id); err == nil {
			return info, nil
		}
		return c.fetchMovie(ctx, id)
	}
}

// Suggestions returns a small list of potential matches for autocomplete.
func (c *Client) Suggestions(ctx context.Context, query string, limit int) ([]Suggestion, error) {
	results, err := c.search(ctx, query)
	if err != nil {
		return nil, err
	}

	suggestions := make([]Suggestion, 0, len(results))
	for _, result := range results {
		if result.MediaType != "tv" && result.MediaType != "movie" {
			continue
		}
		name := result.Title
		if name == "" {
			name = result.Name
		}
		if name == "" {
			continue
		}

		year := result.ReleaseDate
		if year == "" {
			year = result.FirstAirDate
		}

		poster := ""
		if result.PosterPath != "" {
			poster = buildPosterURL(result.PosterPath)
		}

		suggestions = append(suggestions, Suggestion{
			ID:        result.ID,
			Title:     name,
			MediaType: result.MediaType,
			Year:      yearFromDate(year),
			PosterURL: poster,
		})

		if limit > 0 && len(suggestions) >= limit {
			break
		}
	}

	return suggestions, nil
}

// Trending returns TMDB trending titles (movies + TV) for a time window.
func (c *Client) Trending(ctx context.Context, window string, limit int) ([]Suggestion, error) {
	window = normalizeWindow(window)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fmt.Sprintf("%s/trending/all/%s", c.baseURL, window), nil)
	if err != nil {
		return nil, err
	}

	q := req.URL.Query()
	q.Set("language", "uk-UA")
	req.URL.RawQuery = q.Encode()

	var payload trendingResponse
	if err := c.do(req, &payload); err != nil {
		return nil, err
	}

	out := make([]Suggestion, 0, len(payload.Results))
	for _, result := range payload.Results {
		if result.MediaType != "tv" && result.MediaType != "movie" {
			continue
		}
		name := result.Title
		if name == "" {
			name = result.Name
		}
		if name == "" {
			continue
		}
		year := result.ReleaseDate
		if year == "" {
			year = result.FirstAirDate
		}
		poster := ""
		if result.PosterPath != "" {
			poster = buildPosterURL(result.PosterPath)
		}
		out = append(out, Suggestion{
			ID:        result.ID,
			Title:     name,
			MediaType: result.MediaType,
			Year:      yearFromDate(year),
			PosterURL: poster,
		})
		if limit > 0 && len(out) >= limit {
			break
		}
	}

	return out, nil
}

// TrendingByType returns TMDB trending titles for a specific media type.
func (c *Client) TrendingByType(
	ctx context.Context,
	mediaType string,
	window string,
	limit int,
) ([]Suggestion, error) {
	if mediaType != "movie" && mediaType != "tv" {
		return nil, fmt.Errorf("unsupported media type: %s", mediaType)
	}

	window = normalizeWindow(window)
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		fmt.Sprintf("%s/trending/%s/%s", c.baseURL, mediaType, window),
		nil,
	)
	if err != nil {
		return nil, err
	}

	q := req.URL.Query()
	q.Set("language", "uk-UA")
	req.URL.RawQuery = q.Encode()

	var payload trendingResponse
	if err := c.do(req, &payload); err != nil {
		return nil, err
	}

	out := make([]Suggestion, 0, len(payload.Results))
	for _, result := range payload.Results {
		name := result.Title
		if name == "" {
			name = result.Name
		}
		if name == "" {
			continue
		}
		year := result.ReleaseDate
		if year == "" {
			year = result.FirstAirDate
		}
		poster := ""
		if result.PosterPath != "" {
			poster = buildPosterURL(result.PosterPath)
		}
		out = append(out, Suggestion{
			ID:        result.ID,
			Title:     name,
			MediaType: mediaType,
			Year:      yearFromDate(year),
			PosterURL: poster,
		})
		if limit > 0 && len(out) >= limit {
			break
		}
	}

	return out, nil
}

func (c *Client) search(ctx context.Context, title string) ([]searchResult, error) {
	payload, err := c.searchPage(ctx, title, 1)
	if err != nil {
		return nil, err
	}

	return payload.Results, nil
}

func (c *Client) searchPage(ctx context.Context, title string, page int) (multiSearchResponse, error) {
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		fmt.Sprintf("%s/search/multi", c.baseURL),
		nil,
	)
	if err != nil {
		return multiSearchResponse{}, err
	}

	q := req.URL.Query()
	q.Set("query", title)
	q.Set("include_adult", "false")
	q.Set("language", "uk-UA")
	if page > 0 {
		q.Set("page", strconv.Itoa(page))
	}
	req.URL.RawQuery = q.Encode()

	var payload multiSearchResponse
	if err := c.do(req, &payload); err != nil {
		return multiSearchResponse{}, err
	}

	return payload, nil
}

type SearchResults struct {
	Results      []Suggestion
	Page         int
	TotalPages   int
	TotalResults int
}

// SearchAll returns paginated TMDB search results (movies + TV).
func (c *Client) SearchAll(ctx context.Context, query string, page int) (SearchResults, error) {
	if page < 1 {
		page = 1
	}
	payload, err := c.searchPage(ctx, query, page)
	if err != nil {
		return SearchResults{}, err
	}

	out := make([]Suggestion, 0, len(payload.Results))
	for _, result := range payload.Results {
		if result.MediaType != "tv" && result.MediaType != "movie" {
			continue
		}
		name := result.Title
		if name == "" {
			name = result.Name
		}
		if name == "" {
			continue
		}
		year := result.ReleaseDate
		if year == "" {
			year = result.FirstAirDate
		}
		poster := ""
		if result.PosterPath != "" {
			poster = buildPosterURL(result.PosterPath)
		}
		out = append(out, Suggestion{
			ID:        result.ID,
			Title:     name,
			MediaType: result.MediaType,
			Year:      yearFromDate(year),
			PosterURL: poster,
		})
	}

	return SearchResults{
		Results:      out,
		Page:         payload.Page,
		TotalPages:   payload.TotalPages,
		TotalResults: payload.TotalResults,
	}, nil
}

// DetailsByID returns full TMDB details for a movie or TV show.
func (c *Client) DetailsByID(ctx context.Context, id int, mediaType string) (DetailInfo, error) {
	switch mediaType {
	case "movie":
		return c.fetchMovieDetails(ctx, id)
	case "tv":
		return c.fetchTVDetails(ctx, id)
	default:
		return DetailInfo{}, fmt.Errorf("unsupported media type: %s", mediaType)
	}
}

// Recommendations returns similar titles for a movie or TV show.
func (c *Client) Recommendations(
	ctx context.Context,
	id int,
	mediaType string,
	limit int,
) ([]Suggestion, error) {
	if mediaType != "movie" && mediaType != "tv" {
		return nil, fmt.Errorf("unsupported media type: %s", mediaType)
	}
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		fmt.Sprintf("%s/%s/%d/recommendations", c.baseURL, mediaType, id),
		nil,
	)
	if err != nil {
		return nil, err
	}

	q := req.URL.Query()
	q.Set("language", "uk-UA")
	req.URL.RawQuery = q.Encode()

	var payload recommendationResponse
	if err := c.do(req, &payload); err != nil {
		return nil, err
	}

	out := make([]Suggestion, 0, len(payload.Results))
	for _, result := range payload.Results {
		name := result.Title
		if name == "" {
			name = result.Name
		}
		if name == "" {
			continue
		}
		year := result.ReleaseDate
		if year == "" {
			year = result.FirstAirDate
		}
		poster := ""
		if result.PosterPath != "" {
			poster = buildPosterURL(result.PosterPath)
		}
		out = append(out, Suggestion{
			ID:        result.ID,
			Title:     name,
			MediaType: mediaType,
			Year:      yearFromDate(year),
			PosterURL: poster,
		})
		if limit > 0 && len(out) >= limit {
			break
		}
	}

	return out, nil
}

func (c *Client) fetchTV(ctx context.Context, id int) (ReleaseInfo, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fmt.Sprintf("%s/tv/%d", c.baseURL, id), nil)
	if err != nil {
		return ReleaseInfo{}, err
	}

	q := req.URL.Query()
	q.Set("language", "uk-UA")
	q.Set("append_to_response", "next_episode_to_air,last_episode_to_air")
	req.URL.RawQuery = q.Encode()

	var payload tvDetailsResponse
	if err := c.do(req, &payload); err != nil {
		return ReleaseInfo{}, err
	}

	poster := ""
	if payload.PosterPath != "" {
		poster = buildPosterURL(payload.PosterPath)
	}
	backdrop := ""
	if payload.BackdropPath != "" {
		backdrop = buildBackdropURL(payload.BackdropPath)
	}

	if payload.NextEpisode != nil && payload.NextEpisode.AirDate != "" {
		releaseDate, err := time.Parse("2006-01-02", payload.NextEpisode.AirDate)
		if err != nil {
			return ReleaseInfo{}, err
		}

		return ReleaseInfo{
			Title:       payload.Name,
			Type:        "series",
			NextRelease: releaseDate,
			Source:      "tmdb",
			PosterURL:   poster,
			BackdropURL: backdrop,
			Status:      releasestatus.StatusUpcoming,
		}, nil
	}

	if (strings.EqualFold(payload.Status, "Ended") || strings.EqualFold(payload.Status, "Returning Series")) && payload.LastEpisode != nil && payload.LastEpisode.AirDate != "" {
		releaseDate, err := time.Parse("2006-01-02", payload.LastEpisode.AirDate)
		if err != nil {
			return ReleaseInfo{}, err
		}
		return ReleaseInfo{
			Title:       payload.Name,
			Type:        "series",
			NextRelease: releaseDate,
			Source:      "tmdb",
			PosterURL:   poster,
			BackdropURL: backdrop,
			Status:      releasestatus.StatusEnded,
		}, nil
	}

	return ReleaseInfo{}, ErrNotFound

}

func (c *Client) fetchMovieDetails(ctx context.Context, id int) (DetailInfo, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fmt.Sprintf("%s/movie/%d", c.baseURL, id), nil)
	if err != nil {
		return DetailInfo{}, err
	}

	q := req.URL.Query()
	q.Set("language", "uk-UA")
	req.URL.RawQuery = q.Encode()

	var payload movieDetailsResponse
	if err := c.do(req, &payload); err != nil {
		if strings.Contains(err.Error(), "status 404") {
			return DetailInfo{}, ErrNotFound
		}
		return DetailInfo{}, err
	}

	poster := ""
	if payload.PosterPath != "" {
		poster = buildPosterURL(payload.PosterPath)
	}
	backdrop := ""
	if payload.BackdropPath != "" {
		backdrop = buildBackdropURL(payload.BackdropPath)
	}
	genres := make([]string, 0, len(payload.Genres))
	for _, genre := range payload.Genres {
		if genre.Name != "" {
			genres = append(genres, genre.Name)
		}
	}

	return DetailInfo{
		ID:            id,
		Title:         payload.Title,
		MediaType:     "movie",
		Overview:      payload.Overview,
		Tagline:       payload.Tagline,
		PosterURL:     poster,
		BackdropURL:   backdrop,
		Status:        payload.Status,
		ReleaseDate:   payload.ReleaseDate,
		Runtime:       payload.Runtime,
		Genres:        genres,
		VoteAverage:   payload.VoteAverage,
		VoteCount:     payload.VoteCount,
		Popularity:    payload.Popularity,
		Homepage:      payload.Homepage,
		OriginCountry: payload.OriginCountry,
	}, nil
}

func (c *Client) fetchTVDetails(ctx context.Context, id int) (DetailInfo, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fmt.Sprintf("%s/tv/%d", c.baseURL, id), nil)
	if err != nil {
		return DetailInfo{}, err
	}

	q := req.URL.Query()
	q.Set("language", "uk-UA")
	q.Set("append_to_response", "next_episode_to_air,last_episode_to_air")
	req.URL.RawQuery = q.Encode()

	var payload tvDetailsResponse
	if err := c.do(req, &payload); err != nil {
		if strings.Contains(err.Error(), "status 404") {
			return DetailInfo{}, ErrNotFound
		}
		return DetailInfo{}, err
	}

	poster := ""
	if payload.PosterPath != "" {
		poster = buildPosterURL(payload.PosterPath)
	}
	backdrop := ""
	if payload.BackdropPath != "" {
		backdrop = buildBackdropURL(payload.BackdropPath)
	}
	genres := make([]string, 0, len(payload.Genres))
	for _, genre := range payload.Genres {
		if genre.Name != "" {
			genres = append(genres, genre.Name)
		}
	}
	networks := make([]string, 0, len(payload.Networks))
	for _, network := range payload.Networks {
		if network.Name != "" {
			networks = append(networks, network.Name)
		}
	}
	runtime := 0
	if len(payload.EpisodeRunTime) > 0 {
		runtime = payload.EpisodeRunTime[0]
	}
	nextAirDate := ""
	nextEpisodeName := ""
	nextEpisodeSeason := 0
	nextEpisodeNumber := 0
	if payload.NextEpisode != nil {
		nextAirDate = payload.NextEpisode.AirDate
		nextEpisodeName = payload.NextEpisode.Name
		nextEpisodeSeason = payload.NextEpisode.SeasonNumber
		nextEpisodeNumber = payload.NextEpisode.EpisodeNumber
	}
	lastAirDate := payload.LastAirDate
	lastEpisodeName := ""
	lastEpisodeSeason := 0
	lastEpisodeNumber := 0
	if payload.LastEpisode != nil {
		if payload.LastEpisode.AirDate != "" {
			lastAirDate = payload.LastEpisode.AirDate
		}
		lastEpisodeName = payload.LastEpisode.Name
		lastEpisodeSeason = payload.LastEpisode.SeasonNumber
		lastEpisodeNumber = payload.LastEpisode.EpisodeNumber
	}

	return DetailInfo{
		ID:                id,
		Title:             payload.Name,
		MediaType:         "tv",
		Overview:          payload.Overview,
		Tagline:           payload.Tagline,
		PosterURL:         poster,
		BackdropURL:       backdrop,
		Status:            payload.Status,
		FirstAirDate:      payload.FirstAirDate,
		LastAirDate:       lastAirDate,
		NextAirDate:       nextAirDate,
		NextEpisode:       nextEpisodeName,
		NextEpisodeSeason: nextEpisodeSeason,
		NextEpisodeNumber: nextEpisodeNumber,
		LastEpisode:       lastEpisodeName,
		LastEpisodeSeason: lastEpisodeSeason,
		LastEpisodeNumber: lastEpisodeNumber,
		SeasonCount:       payload.NumberSeasons,
		EpisodeCount:      payload.NumberEpisodes,
		Runtime:           runtime,
		Genres:            genres,
		Networks:          networks,
		VoteAverage:       payload.VoteAverage,
		VoteCount:         payload.VoteCount,
		Popularity:        payload.Popularity,
		Homepage:          payload.Homepage,
		OriginCountry:     payload.OriginCountry,
	}, nil
}

func (c *Client) fetchMovie(ctx context.Context, id int) (ReleaseInfo, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fmt.Sprintf("%s/movie/%d", c.baseURL, id), nil)
	if err != nil {
		return ReleaseInfo{}, err
	}

	q := req.URL.Query()
	q.Set("language", "uk-UA")
	req.URL.RawQuery = q.Encode()

	var payload movieDetailsResponse
	if err := c.do(req, &payload); err != nil {
		return ReleaseInfo{}, err
	}

	if payload.ReleaseDate == "" {
		return ReleaseInfo{}, ErrNotFound
	}

	releaseDate, err := time.Parse("2006-01-02", payload.ReleaseDate)
	if err != nil {
		return ReleaseInfo{}, err
	}

	poster := ""
	if payload.PosterPath != "" {
		poster = buildPosterURL(payload.PosterPath)
	}
	backdrop := ""
	if payload.BackdropPath != "" {
		backdrop = buildBackdropURL(payload.BackdropPath)
	}

	return ReleaseInfo{
		Title:       payload.Title,
		Type:        "movie",
		NextRelease: releaseDate,
		Source:      "tmdb",
		PosterURL:   poster,
		BackdropURL: backdrop,
		Status:      movieStatus(releaseDate),
	}, nil
}

func movieStatus(releaseDate time.Time) string {
	if time.Now().Before(releaseDate) {
		return releasestatus.StatusUpcoming
	}
	return releasestatus.StatusReleased
}

func (c *Client) do(req *http.Request, dst any) error {
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.token))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return ErrNotFound
	}
	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 256))
		return fmt.Errorf("tmdb: unexpected status %d: %s", resp.StatusCode, string(body))
	}

	if dst == nil {
		return nil
	}

	return json.NewDecoder(resp.Body).Decode(dst)
}

type searchResult struct {
	ID           int    `json:"id"`
	MediaType    string `json:"media_type"`
	Title        string `json:"title"`
	Name         string `json:"name"`
	ReleaseDate  string `json:"release_date"`
	FirstAirDate string `json:"first_air_date"`
	PosterPath   string `json:"poster_path"`
}

type multiSearchResponse struct {
	Page         int            `json:"page"`
	TotalPages   int            `json:"total_pages"`
	TotalResults int            `json:"total_results"`
	Results      []searchResult `json:"results"`
}

type trendingResponse struct {
	Results []trendingResult `json:"results"`
}

type trendingResult struct {
	ID           int    `json:"id"`
	MediaType    string `json:"media_type"`
	Title        string `json:"title"`
	Name         string `json:"name"`
	ReleaseDate  string `json:"release_date"`
	FirstAirDate string `json:"first_air_date"`
	PosterPath   string `json:"poster_path"`
}

type recommendationResponse struct {
	Results []recommendationResult `json:"results"`
}

type recommendationResult struct {
	ID           int    `json:"id"`
	Title        string `json:"title"`
	Name         string `json:"name"`
	ReleaseDate  string `json:"release_date"`
	FirstAirDate string `json:"first_air_date"`
	PosterPath   string `json:"poster_path"`
}

type movieDetailsResponse struct {
	Title         string      `json:"title"`
	Overview      string      `json:"overview"`
	Tagline       string      `json:"tagline"`
	Status        string      `json:"status"`
	ReleaseDate   string      `json:"release_date"`
	Runtime       int         `json:"runtime"`
	Genres        []tmdbGenre `json:"genres"`
	PosterPath    string      `json:"poster_path"`
	BackdropPath  string      `json:"backdrop_path"`
	VoteAverage   float64     `json:"vote_average"`
	VoteCount     int         `json:"vote_count"`
	Popularity    float64     `json:"popularity"`
	Homepage      string      `json:"homepage"`
	OriginCountry []string    `json:"origin_country"`
}

type tvDetailsResponse struct {
	Name           string          `json:"name"`
	Overview       string          `json:"overview"`
	Tagline        string          `json:"tagline"`
	Status         string          `json:"status"`
	FirstAirDate   string          `json:"first_air_date"`
	LastAirDate    string          `json:"last_air_date"`
	NextEpisode    *tvEpisodeEntry `json:"next_episode_to_air"`
	LastEpisode    *tvEpisodeEntry `json:"last_episode_to_air"`
	NumberSeasons  int             `json:"number_of_seasons"`
	NumberEpisodes int             `json:"number_of_episodes"`
	EpisodeRunTime []int           `json:"episode_run_time"`
	Genres         []tmdbGenre     `json:"genres"`
	Networks       []tmdbNetwork   `json:"networks"`
	PosterPath     string          `json:"poster_path"`
	BackdropPath   string          `json:"backdrop_path"`
	VoteAverage    float64         `json:"vote_average"`
	VoteCount      int             `json:"vote_count"`
	Popularity     float64         `json:"popularity"`
	Homepage       string          `json:"homepage"`
	OriginCountry  []string        `json:"origin_country"`
}

type tmdbGenre struct {
	Name string `json:"name"`
}

type tmdbNetwork struct {
	Name string `json:"name"`
}

type tvEpisodeEntry struct {
	AirDate       string `json:"air_date"`
	Name          string `json:"name"`
	SeasonNumber  int    `json:"season_number"`
	EpisodeNumber int    `json:"episode_number"`
}

func yearFromDate(date string) string {
	if len(date) >= 4 {
		return date[:4]
	}
	return ""
}

func normalizeWindow(window string) string {
	switch strings.ToLower(strings.TrimSpace(window)) {
	case "week":
		return "week"
	default:
		return "day"
	}
}

func buildPosterURL(path string) string {
	if path == "" {
		return ""
	}
	return fmt.Sprintf("%s%s", posterBaseURL, path)
}

func buildBackdropURL(path string) string {
	if path == "" {
		return ""
	}
	return fmt.Sprintf("%s%s", backdropBaseURL, path)
}
