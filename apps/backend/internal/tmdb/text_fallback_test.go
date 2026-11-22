package tmdb

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
)

func localizedTestClient(t *testing.T, handler http.HandlerFunc) *Client {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	client := &Client{baseURL: server.URL, httpClient: server.Client(), token: "test"}
	if err := client.ConfigureTitleCatalog("", ""); err != nil {
		t.Fatal(err)
	}
	return client
}

func TestDetailsTextFallbackPreservesUkrainianAndNonTextFields(t *testing.T) {
	var english atomic.Int32
	client := localizedTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("language") == "en-US" {
			english.Add(1)
			fmt.Fprint(w, `{"id":42,"title":"English title","overview":"An English synopsis.","runtime":120,"release_date":"2025-01-01"}`)
		} else {
			fmt.Fprint(w, `{"id":42,"title":"Українська назва","overview":" ","runtime":100,"release_date":"2024-01-01","genres":[{"id":18,"name":"Драма"}],"credits":{"cast":[{"id":1,"name":"Актор"}]}}`)
		}
	})
	for i := 0; i < 2; i++ {
		detail, err := client.DetailsByID(context.Background(), 42, "movie")
		if err != nil {
			t.Fatal(err)
		}
		if detail.Title != "Українська назва" || detail.Overview != "An English synopsis." || detail.Runtime != 100 || detail.ReleaseDate != "2024-01-01" || detail.Genres[0] != "Драма" || detail.Cast[0].Name != "Актор" {
			t.Fatalf("incorrect merge: %+v", detail)
		}
	}
	if english.Load() != 1 {
		t.Fatalf("fallback was not cached: %d", english.Load())
	}
}

func TestJeanMarcFallbackAndUkrainianAlias(t *testing.T) {
	client := localizedTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/search/multi" {
			fmt.Fprint(w, `{"page":1,"total_pages":0,"total_results":0,"results":[]}`)
			return
		}
		if r.URL.Query().Get("language") == "en-US" {
			fmt.Fprint(w, `{"id":442269,"title":"Anatomy of a Marriage: My Days with Jean-Marc","overview":"The story of a couple told from Jean-Marc's perspective."}`)
		} else {
			fmt.Fprint(w, `{"id":442269,"title":"Jean-Marc ou La Vie conjugale","original_title":"Jean-Marc ou La Vie conjugale","original_language":"fr","overview":"","release_date":"1964-01-01"}`)
		}
	})
	detail, err := client.DetailsByID(context.Background(), 442269, "movie")
	if err != nil || detail.Title != "Anatomy of a Marriage: My Days with Jean-Marc" || detail.Overview == "" {
		t.Fatalf("details: %+v, %v", detail, err)
	}
	for _, query := range []string{"Жан–Марк", "Жан Марк або подружнє життя", "Jean-Marc ou La Vie conjugale"} {
		result, err := client.SearchAll(context.Background(), query, 1)
		if err != nil || len(result.Results) != 1 || result.Results[0].ID != 442269 {
			t.Fatalf("query %q: %+v, %v", query, result, err)
		}
		suggestions, err := client.Suggestions(context.Background(), query, 5)
		if err != nil || len(suggestions) != 1 || suggestions[0].Title != detail.Title {
			t.Fatalf("suggestions: %+v, %v", suggestions, err)
		}
	}
}

func TestDiscoveryFallbackMatchesIDsNotOrderOrMediaIDAlone(t *testing.T) {
	client := localizedTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("language") == "en-US" {
			fmt.Fprint(w, `{"results":[{"id":2,"media_type":"movie","title":"Second"},{"id":1,"media_type":"tv","name":"Series"},{"id":1,"media_type":"movie","title":"First"}]}`)
		} else {
			fmt.Fprint(w, `{"results":[{"id":1,"media_type":"movie","title":"电影"},{"id":1,"media_type":"tv","name":"ドラマ"},{"id":2,"media_type":"movie","title":"Український фільм"}]}`)
		}
	})
	items, err := client.Trending(context.Background(), "week", 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 3 || items[0].Title != "First" || items[1].Title != "Series" || items[2].Title != "Український фільм" {
		t.Fatalf("wrong titles: %+v", items)
	}
}

func TestEpisodesFallbackAndNoEpisodeAliases(t *testing.T) {
	client := localizedTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("language") == "en-US" {
			fmt.Fprint(w, `{"episodes":[{"id":1,"episode_number":1,"name":"Pilot","overview":"First episode."}]}`)
		} else {
			fmt.Fprint(w, `{"episodes":[{"id":1,"episode_number":1,"name":"第一話","overview":"","air_date":"2024-01-01"}]}`)
		}
	})
	items, err := client.SeasonEpisodes(context.Background(), 10, 1)
	if err != nil || len(items) != 1 || items[0].Name != "Pilot" || items[0].Overview != "First episode." || items[0].AirDate != "2024-01-01" {
		t.Fatalf("episodes: %+v, %v", items, err)
	}
	if matches := client.catalog.search("Pilot"); len(matches) != 0 {
		t.Fatalf("episode polluted title catalog: %+v", matches)
	}
}

func TestUnavailableEnglishDoesNotFailOrEraseValidResponse(t *testing.T) {
	var calls atomic.Int32
	client := localizedTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("language") == "en-US" {
			calls.Add(1)
			w.WriteHeader(503)
			return
		}
		fmt.Fprint(w, `{"id":1,"title":"原題","overview":"","runtime":99}`)
	})
	for i := 0; i < 2; i++ {
		item, err := client.DetailsByID(context.Background(), 1, "movie")
		if err != nil || item.Title != "原題" || item.Runtime != 99 || item.Overview != "" {
			t.Fatalf("fallback failure broke response: %+v %v", item, err)
		}
	}
	if calls.Load() != 1 {
		t.Fatal("failed fallback should have a retry cooldown")
	}
}

func TestConcurrentFallbackAndCatalog(t *testing.T) {
	client := localizedTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("language") == "en-US" {
			fmt.Fprint(w, `{"id":1,"title":"English","overview":"Synopsis"}`)
		} else {
			fmt.Fprint(w, `{"id":1,"title":"电影","overview":""}`)
		}
	})
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			item, err := client.DetailsByID(context.Background(), 1, "movie")
			if err != nil || item.Title != "English" {
				t.Errorf("details: %+v %v", item, err)
			}
			client.catalog.search("English")
		}()
	}
	wg.Wait()
}

func TestTitleCatalogPersistenceOverridesAndTypoSearch(t *testing.T) {
	dir := t.TempDir()
	cache := filepath.Join(dir, "catalog.json")
	overrides := filepath.Join(dir, "overrides.json")
	if err := os.WriteFile(overrides, []byte(`[{"id":42,"mediaType":"movie","title":"Редакторська назва","aliases":["Сім’я героя"],"overview":"Перевірений опис."}]`), 0600); err != nil {
		t.Fatal(err)
	}
	client := localizedTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/search/multi" {
			fmt.Fprint(w, `{"page":1,"total_pages":0,"results":[]}`)
			return
		}
		fmt.Fprint(w, `{"id":42,"title":"Original","overview":"","translations":{"translations":[{"iso_639_1":"uk","data":{"title":"Інша назва"}}]}}`)
	})
	if err := client.ConfigureTitleCatalog(cache, overrides); err != nil {
		t.Fatal(err)
	}
	detail, err := client.DetailsByID(context.Background(), 42, "movie")
	if err != nil || detail.Title != "Редакторська назва" || detail.Overview != "Перевірений опис." {
		t.Fatalf("override: %+v %v", detail, err)
	}
	if err := client.FlushTitleCatalog(); err != nil {
		t.Fatal(err)
	}
	if err := client.ConfigureTitleCatalog(cache, overrides); err != nil {
		t.Fatal(err)
	}
	for _, query := range []string{"сім'я героя", "Інша назва", "Редакторська назва"} {
		result, err := client.SearchAll(context.Background(), query, 1)
		if err != nil || len(result.Results) != 1 || result.Results[0].ID != 42 {
			t.Fatalf("query %q: %+v %v", query, result, err)
		}
	}
	if titleMatch("кот", "кит") != 0 {
		t.Fatal("short unrelated titles must not fuzzy-match")
	}
}

func TestAliasPaginationHasNoDuplicatesAndKeepsRemotePagination(t *testing.T) {
	client := localizedTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("query") == "broad" {
			fmt.Fprint(w, `{"page":2,"total_pages":5,"total_results":100,"results":[{"id":99,"media_type":"movie","title":"Remote"}]}`)
			return
		}
		fmt.Fprint(w, `{"page":1,"total_pages":1,"total_results":1,"results":[{"id":1,"media_type":"movie","title":"Серія 1"}]}`)
	})
	for i := 1; i <= 25; i++ {
		client.catalog.remember(textNode{kind: "movie", data: map[string]any{"id": float64(i), "title": fmt.Sprintf("Серія %d", i)}, aliases: []string{fmt.Sprintf("Серія %d", i), "broad"}})
	}
	seen := map[int]bool{}
	for page := 1; page <= 2; page++ {
		result, err := client.SearchAll(context.Background(), "Серія", page)
		if err != nil || result.TotalResults != 25 || result.TotalPages != 2 {
			t.Fatalf("page: %+v %v", result, err)
		}
		for _, item := range result.Results {
			if seen[item.ID] {
				t.Fatalf("duplicate %d", item.ID)
			}
			seen[item.ID] = true
		}
	}
	if len(seen) != 25 {
		t.Fatal("lost local titles")
	}
	result, err := client.SearchAll(context.Background(), "broad", 2)
	if err != nil || result.Page != 2 || result.TotalPages != 5 || len(result.Results) != 1 || result.Results[0].ID != 99 {
		t.Fatalf("remote pages changed: %+v %v", result, err)
	}
}

func TestValidUkrainianDoesNotRequestEnglish(t *testing.T) {
	client := localizedTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("language") != "uk-UA" {
			t.Error("unnecessary English request")
		}
		json.NewEncoder(w).Encode(map[string]any{"id": 1, "title": "Фільм", "overview": "Український опис.", "tagline": "Гасло"})
	})
	if _, err := client.DetailsByID(context.Background(), 1, "movie"); err != nil {
		t.Fatal(err)
	}
}

func TestFilmographyFallbackAndNullDescription(t *testing.T) {
	client := localizedTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/movie/2" {
			if r.URL.Query().Get("language") == "uk-UA" {
				fmt.Fprint(w, `{"id":2,"title":"Назва","overview":null}`)
			} else {
				fmt.Fprint(w, `{"id":2,"title":"Title","overview":"Available synopsis"}`)
			}
			return
		}
		if r.URL.Query().Get("language") == "en-US" {
			if r.URL.Query().Get("append_to_response") != "combined_credits" {
				t.Error("filmography must be included in fallback")
			}
			fmt.Fprint(w, `{"id":1,"name":"Person","biography":"Biography","combined_credits":{"cast":[{"id":2,"media_type":"movie","title":"Movie"}]}}`)
		} else {
			fmt.Fprint(w, `{"id":1,"name":"Людина","biography":"Біографія","combined_credits":{"cast":[{"id":2,"media_type":"movie","title":"映画"}]}}`)
		}
	})
	person, err := client.PersonByID(context.Background(), 1)
	if err != nil || len(person.Credits) != 1 || person.Credits[0].Title != "Movie" || person.Name != "Людина" {
		t.Fatalf("filmography: %+v %v", person, err)
	}
	movie, err := client.DetailsByID(context.Background(), 2, "movie")
	if err != nil || movie.Title != "Назва" || movie.Overview != "Available synopsis" {
		t.Fatalf("null description: %+v %v", movie, err)
	}
}
