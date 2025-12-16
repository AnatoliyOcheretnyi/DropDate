package tmdb

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/releasestatus"
)

const defaultBaseURL = "https://api.themoviedb.org/3"
const posterBaseURL = "https://image.tmdb.org/t/p/w342"

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
	Status      string
}

// Suggestion is a lightweight search result.
type Suggestion struct {
	ID        int
	Title     string
	MediaType string
	Year      string
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

		suggestions = append(suggestions, Suggestion{
			ID:        result.ID,
			Title:     name,
			MediaType: result.MediaType,
			Year:      yearFromDate(year),
		})

		if limit > 0 && len(suggestions) >= limit {
			break
		}
	}

	return suggestions, nil
}

func (c *Client) search(ctx context.Context, title string) ([]searchResult, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fmt.Sprintf("%s/search/multi", c.baseURL), nil)
	if err != nil {
		return nil, err
	}

	q := req.URL.Query()
	q.Set("query", title)
	q.Set("include_adult", "false")
	q.Set("language", "uk-UA")
	req.URL.RawQuery = q.Encode()

	var payload multiSearchResponse
	if err := c.do(req, &payload); err != nil {
		return nil, err
	}

	return payload.Results, nil
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
			Status:      releasestatus.StatusEnded,
		}, nil
	}

	return ReleaseInfo{}, ErrNotFound

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

	return ReleaseInfo{
		Title:       payload.Title,
		Type:        "movie",
		NextRelease: releaseDate,
		Source:      "tmdb",
		PosterURL:   poster,
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
}

type multiSearchResponse struct {
	Results []searchResult `json:"results"`
}

type tvDetailsResponse struct {
	Name        string          `json:"name"`
	NextEpisode *tvEpisodeEntry `json:"next_episode_to_air"`
	LastEpisode *tvEpisodeEntry `json:"last_episode_to_air"`
	Status      string          `json:"status"`
	PosterPath  string          `json:"poster_path"`
}

type tvEpisodeEntry struct {
	AirDate string `json:"air_date"`
}

type movieDetailsResponse struct {
	Title       string `json:"title"`
	ReleaseDate string `json:"release_date"`
	PosterPath  string `json:"poster_path"`
}

func yearFromDate(date string) string {
	if len(date) >= 4 {
		return date[:4]
	}
	return ""
}

func buildPosterURL(path string) string {
	if path == "" {
		return ""
	}
	return fmt.Sprintf("%s%s", posterBaseURL, path)
}
