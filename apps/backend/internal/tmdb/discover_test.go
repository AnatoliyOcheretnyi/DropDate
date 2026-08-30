package tmdb

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
)

// The keyword joins carry the whole meaning of a query: TMDB reads "," as AND
// and "|" as OR, so getting the separator wrong turns "жах І кров" into
// "жах АБО кров" without failing anywhere.
func TestDiscoverJoinsKeywordGroups(t *testing.T) {
	var got url.Values
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = r.URL.Query()
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"results":[]}`))
	}))
	defer server.Close()

	client := &Client{baseURL: server.URL, httpClient: server.Client(), token: "test"}
	_, err := client.Discover(context.Background(), DiscoverParams{
		MediaType:         "movie",
		WithKeywords:      []int{1, 2},
		WithKeywordGroups: [][]int{{3, 4}, {}, {5}},
	})
	if err != nil {
		t.Fatalf("discover: %v", err)
	}

	if want := "1|2,3|4,5"; got.Get("with_keywords") != want {
		t.Fatalf("with_keywords = %q, want %q", got.Get("with_keywords"), want)
	}
	// The adult catalogue stays out of every query: the new adult themes reach
	// erotic thrillers and slashers, never the pornographic catalogue.
	if got.Get("include_adult") != "false" {
		t.Fatalf("include_adult = %q, want false", got.Get("include_adult"))
	}
}
