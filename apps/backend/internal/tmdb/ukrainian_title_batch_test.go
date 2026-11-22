package tmdb

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"path/filepath"
	"sync/atomic"
	"testing"
)

func TestListTitlesTranslateBeforeOpeningDetailsAndPersistForSavedLists(t *testing.T) {
	client := localizedTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/search/multi" {
			t.Errorf("unexpected detail lookup: %s", r.URL.Path)
		}
		fmt.Fprint(w, `{"page":1,"total_pages":1,"total_results":3,"results":[{"id":42,"media_type":"movie","title":"Jean-Marc ou La Vie conjugale","original_title":"Jean-Marc ou La Vie conjugale","original_language":"fr"},{"id":43,"media_type":"movie","title":"Françoise ou La Vie conjugale","original_title":"Françoise ou La Vie conjugale","original_language":"fr"},{"id":44,"media_type":"movie","title":"Офіційна українська назва"}]}`)
	})
	path := filepath.Join(t.TempDir(), "catalog.json")
	if err := client.ConfigureTitleCatalog(path, ""); err != nil {
		t.Fatal(err)
	}
	enableTestTranslation(client, func(context.Context, translationInput) (translationInput, error) {
		t.Error("list fetched a detail translation")
		return translationInput{}, errors.New("unexpected")
	})
	var calls atomic.Int32
	client.machine.translateTitles = func(_ context.Context, titles []string) ([]string, error) {
		calls.Add(1)
		if len(titles) != 2 || titles[0] != "Jean-Marc ou La Vie conjugale" || titles[1] != "Françoise ou La Vie conjugale" {
			t.Errorf("wrong batch: %v", titles)
		}
		return []string{"Жан-Марк або Подружнє життя", "Франсуаза або Подружнє життя"}, nil
	}
	items, err := client.SearchAll(context.Background(), "Batch fixture", 1)
	if err != nil || len(items.Results) != 3 || items.Results[0].Title != "Жан-Марк або Подружнє життя" || items.Results[1].Title != "Франсуаза або Подружнє життя" || items.Results[2].Title != "Офіційна українська назва" {
		t.Fatalf("list: %+v %v", items, err)
	}
	if err := client.ConfigureTitleCatalog(path, ""); err != nil {
		t.Fatal(err)
	}
	saved := []Suggestion{{ID: 42, MediaType: "movie", Title: "Jean-Marc ou La Vie conjugale", PosterURL: "poster", Year: "1964"}, {ID: 43, MediaType: "movie", Title: "Françoise ou La Vie conjugale"}}
	localized := client.LocalizeTitles(context.Background(), saved)
	if localized[0].Title != items.Results[0].Title || localized[1].Title != items.Results[1].Title || localized[0].PosterURL != "poster" || localized[0].Year != "1964" || saved[0].Title != "Jean-Marc ou La Vie conjugale" || calls.Load() != 1 {
		t.Fatalf("saved: %+v calls=%d", localized, calls.Load())
	}
}

func TestSavedTitleBatchUsesMediaIdentityAndRetainsOverview(t *testing.T) {
	client := localizedTestClient(t, func(http.ResponseWriter, *http.Request) { t.Error("unexpected HTTP request") })
	enableTestTranslation(client, nil)
	client.catalog.entries = map[string]catalogEntry{
		"movie:42": {Translation: &translatedText{SourceOverview: "A synopsis.", Overview: "Український опис."}},
	}
	client.machine.translateTitles = func(_ context.Context, titles []string) ([]string, error) {
		if len(titles) != 2 {
			t.Errorf("duplicates or missing identity: %v", titles)
		}
		return []string{"Назва фільму", "Назва серіалу"}, nil
	}
	items := []Suggestion{{ID: 42, MediaType: "movie", Title: "Movie"}, {ID: 42, MediaType: "tv", Title: "Show"}, {ID: 42, MediaType: "movie", Title: "Movie"}}
	out := client.LocalizeTitles(context.Background(), items)
	if out[0].Title != "Назва фільму" || out[1].Title != "Назва серіалу" || out[2].Title != out[0].Title {
		t.Fatalf("identities: %+v", out)
	}
	if client.catalog.entries["movie:42"].Translation.Overview != "Український опис." {
		t.Fatal("title batch erased existing synopsis")
	}
}

func TestTitleBatchFailureAndInvalidOutputKeepSavedTitles(t *testing.T) {
	for _, output := range [][]string{nil, {"Untranslated"}} {
		t.Run(fmt.Sprint(output), func(t *testing.T) {
			client := localizedTestClient(t, func(http.ResponseWriter, *http.Request) { t.Error("unexpected HTTP request") })
			enableTestTranslation(client, nil)
			calls := 0
			client.machine.translateTitles = func(context.Context, []string) ([]string, error) { calls++; return output, nil }
			for i := 0; i < 2; i++ {
				items := client.LocalizeTitles(context.Background(), []Suggestion{{ID: 42, MediaType: "movie", Title: "Original"}})
				if items[0].Title != "Original" {
					t.Fatalf("lost fallback: %+v", items)
				}
			}
			if calls != 1 {
				t.Fatalf("cooldown ignored: %d", calls)
			}
		})
	}
}
