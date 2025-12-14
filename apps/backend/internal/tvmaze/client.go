package tvmaze // клієнт для відкритого API TVMaze.

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

// Client інкапсулює HTTP-клієнт і базовий URL.
type Client struct {
	baseURL    string
	httpClient *http.Client
}

// NewClient створює клієнт із заданим http.Client (або дефолтним).
func NewClient(httpClient *http.Client) *Client {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 5 * time.Second}
	}
	return &Client{
		baseURL:    "https://api.tvmaze.com",
		httpClient: httpClient,
	}
}

// ReleaseInfo представляє те, що нам потрібно від TVMaze.
type ReleaseInfo struct {
	Title       string
	Type        string
	NextRelease time.Time
	Source      string
	PosterURL   string
}

// ErrNotFound повертаємо, коли API не знайшло серіал.
var ErrNotFound = errors.New("tvmaze: not found")

// NextRelease робить запит до /singlesearch/shows і повертає наступний епізод.
func (c *Client) NextRelease(ctx context.Context, title string) (ReleaseInfo, error) {
	endpoint := fmt.Sprintf("%s/singlesearch/shows", c.baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return ReleaseInfo{}, err
	}

	q := url.Values{}
	q.Set("q", title)
	q.Set("embed", "nextepisode")
	req.URL.RawQuery = q.Encode()

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return ReleaseInfo{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return ReleaseInfo{}, ErrNotFound
	}
	if resp.StatusCode >= 300 {
		return ReleaseInfo{}, fmt.Errorf("tvmaze: unexpected status %d", resp.StatusCode)
	}

	var payload singleSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return ReleaseInfo{}, err
	}

	if payload.Embedded == nil || payload.Embedded.NextEpisode == nil {
		return ReleaseInfo{}, ErrNotFound
	}

	next := payload.Embedded.NextEpisode
	parsedTime, err := time.Parse(time.RFC3339, next.AirStamp)
	if err != nil {
		return ReleaseInfo{}, err
	}

	poster := ""
	if payload.Image != nil {
		poster = payload.Image.Medium
	}

	return ReleaseInfo{
		Title:       payload.Name,
		Type:        "series",
		NextRelease: parsedTime,
		Source:      "tvmaze",
		PosterURL:   poster,
	}, nil
}

// singleSearchResponse описує тільки ті поля, що нам потрібні
type singleSearchResponse struct {
	Name     string               `json:"name"`
	Type     string               `json:"type"`
	Embedded *embeddedInformation `json:"_embedded"`
	Image    *showImage           `json:"image"`
}

type showImage struct {
	Medium   string `json:"medium"`
	Original string `json:"original"`
}

type embeddedInformation struct {
	NextEpisode *episode `json:"nextepisode"`
}

type episode struct {
	Name     string `json:"name"`
	AirStamp string `json:"airstamp"`
}
