package tmdb

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func enableTestTranslation(c *Client, fn func(context.Context, translationInput) (translationInput, error)) {
	c.machine = &machineLocalization{translate: fn, slots: make(chan struct{}, 2), failures: make(map[string]time.Time)}
}

func TestUkrainianTranslationPersistsAndEnrichesSearchWithoutNewCalls(t *testing.T) {
	var calls atomic.Int32
	client := localizedTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/search/multi" {
			fmt.Fprint(w, `{"page":1,"total_pages":1,"total_results":1,"results":[{"id":442269,"media_type":"movie","title":"Jean-Marc ou La Vie conjugale","original_title":"Jean-Marc ou La Vie conjugale","original_language":"fr"}]}`)
			return
		}
		fmt.Fprint(w, `{"id":442269,"title":"Jean-Marc ou La Vie conjugale","original_title":"Jean-Marc ou La Vie conjugale","original_language":"fr","overview":"A couple's story from Jean-Marc's perspective.","runtime":94,"translations":{"translations":[]}}`)
	})
	path := filepath.Join(t.TempDir(), "titles.json")
	if err := client.ConfigureTitleCatalog(path, ""); err != nil {
		t.Fatal(err)
	}
	enableTestTranslation(client, func(_ context.Context, in translationInput) (translationInput, error) {
		calls.Add(1)
		if in.Title != "Jean-Marc ou La Vie conjugale" || in.Overview != "A couple's story from Jean-Marc's perspective." {
			t.Errorf("wrong source: %+v", in)
		}
		return translationInput{Title: "Жан-Марк або Подружнє життя", Overview: "Історія пари з погляду Жан-Марка."}, nil
	})
	for i := 0; i < 2; i++ {
		detail, err := client.DetailsByID(context.Background(), 442269, "movie")
		if err != nil || detail.Title != "Жан-Марк або Подружнє життя" || detail.Overview != "Історія пари з погляду Жан-Марка." || detail.Runtime != 94 || detail.Translation == nil || len(detail.Translation.Fields) != 2 || detail.Translation.OriginalTitle != "Jean-Marc ou La Vie conjugale" {
			t.Fatalf("translated details: %+v %v", detail, err)
		}
		// Loading the saved catalog simulates a fresh server process.
		if err := client.ConfigureTitleCatalog(path, ""); err != nil {
			t.Fatal(err)
		}
	}
	results, err := client.SearchAll(context.Background(), "Жан-Марк або Подружнє життя", 1)
	if err != nil || len(results.Results) != 1 || results.Results[0].Title != "Жан-Марк або Подружнє життя" {
		t.Fatalf("search: %+v %v", results, err)
	}
	if calls.Load() != 1 {
		t.Fatalf("translated %d times", calls.Load())
	}
}

func TestNativeUkrainianWinsOverCachedTranslationAndOnlyMissingFieldsAreSent(t *testing.T) {
	var native atomic.Bool
	client := localizedTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		if native.Load() {
			fmt.Fprint(w, `{"id":42,"title":"Офіційна назва","overview":"Новий український опис.","translations":{"translations":[]}}`)
		} else {
			fmt.Fprint(w, `{"id":42,"title":"Офіційна назва","overview":"An English synopsis.","translations":{"translations":[]}}`)
		}
	})
	var calls int
	enableTestTranslation(client, func(_ context.Context, in translationInput) (translationInput, error) {
		calls++
		if in.Title != "" {
			t.Error("native Ukrainian title sent for translation")
		}
		return translationInput{Overview: "Український переклад опису."}, nil
	})
	first, err := client.DetailsByID(context.Background(), 42, "movie")
	if err != nil || first.Title != "Офіційна назва" || first.Translation == nil || len(first.Translation.Fields) != 1 || first.Translation.Fields[0] != "overview" {
		t.Fatalf("first: %+v %v", first, err)
	}
	native.Store(true)
	second, err := client.DetailsByID(context.Background(), 42, "movie")
	if err != nil || second.Overview != "Новий український опис." || second.Translation != nil || calls != 1 {
		t.Fatalf("native translation lost: %+v %v calls=%d", second, err, calls)
	}
}

func TestOriginalLanguageSynopsisAndExplicitUkrainianTranslation(t *testing.T) {
	var official atomic.Bool
	client := localizedTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		if official.Load() {
			fmt.Fprint(w, `{"id":42,"title":"Original","overview":"","translations":{"translations":[{"iso_639_1":"uk","data":{"title":"Українська назва","overview":"Опис із TMDB."}}]}}`)
		} else {
			fmt.Fprint(w, `{"id":42,"title":"Original","original_language":"fr","overview":"","translations":{"translations":[{"iso_639_1":"fr","data":{"overview":"Une histoire de famille."}}]}}`)
		}
	})
	var calls atomic.Int32
	enableTestTranslation(client, func(_ context.Context, input translationInput) (translationInput, error) {
		calls.Add(1)
		if input.Overview != "Une histoire de famille." {
			t.Errorf("missing original synopsis: %+v", input)
		}
		return translationInput{Title: "Переклад назви", Overview: "Сімейна історія."}, nil
	})
	item, err := client.DetailsByID(context.Background(), 42, "movie")
	if err != nil || item.Overview != "Сімейна історія." || item.Translation == nil {
		t.Fatalf("original source: %+v %v", item, err)
	}
	official.Store(true)
	item, err = client.DetailsByID(context.Background(), 42, "movie")
	if err != nil || item.Title != "Українська назва" || item.Overview != "Опис із TMDB." || item.Translation != nil || calls.Load() != 1 {
		t.Fatalf("native translation: %+v %v", item, err)
	}
}

func TestTranslationFailureHasCooldownAndKeepsSource(t *testing.T) {
	client := localizedTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, `{"id":42,"title":"Original","overview":"English description.","translations":{"translations":[]}}`)
	})
	var calls int
	enableTestTranslation(client, func(context.Context, translationInput) (translationInput, error) {
		calls++
		return translationInput{}, errors.New("quota exceeded")
	})
	for i := 0; i < 2; i++ {
		item, err := client.DetailsByID(context.Background(), 42, "movie")
		if err != nil || item.Title != "Original" || item.Overview != "English description." || item.Translation != nil {
			t.Fatalf("source lost: %+v %v", item, err)
		}
	}
	if calls != 1 {
		t.Fatalf("failure cooldown ignored: %d calls", calls)
	}
}

func TestTranslationValidationRejectsInventedMissingTextAndNonUkrainian(t *testing.T) {
	cases := []struct{ in, out translationInput }{
		{translationInput{Title: "Title"}, translationInput{Title: "Назва", Overview: "Вигаданий сюжет"}},
		{translationInput{Overview: "An overview"}, translationInput{Overview: "An overview"}},
		{translationInput{Title: "Title"}, translationInput{Title: "Необычная история"}},
	}
	for _, test := range cases {
		if validateTranslation(test.in, test.out) == nil {
			t.Fatalf("accepted invalid translation: %+v", test)
		}
	}
	if err := validateTranslation(translationInput{Title: "1917"}, translationInput{Title: "1917"}); err != nil {
		t.Fatal(err)
	}
}

func TestConcurrentTranslationIsSharedAndListsNeverGenerate(t *testing.T) {
	client := localizedTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/trending/all/week" {
			fmt.Fprint(w, `{"results":[{"id":42,"media_type":"movie","title":"Example","overview":"Synopsis."}]}`)
		} else {
			fmt.Fprint(w, `{"id":42,"title":"Example","overview":"Synopsis.","translations":{"translations":[]}}`)
		}
	})
	var calls atomic.Int32
	enableTestTranslation(client, func(_ context.Context, in translationInput) (translationInput, error) {
		calls.Add(1)
		return translationInput{Title: "Приклад", Overview: "Опис українською."}, nil
	})
	if _, err := client.Trending(context.Background(), "week", 20); err != nil {
		t.Fatal(err)
	}
	if calls.Load() != 0 {
		t.Fatal("listing started a model request")
	}
	var wg sync.WaitGroup
	for i := 0; i < 12; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			item, err := client.DetailsByID(context.Background(), 42, "movie")
			if err != nil || item.Title != "Приклад" {
				t.Errorf("details: %+v %v", item, err)
			}
		}()
	}
	wg.Wait()
	if calls.Load() != 1 {
		t.Fatalf("duplicate model calls: %d", calls.Load())
	}
	items, err := client.Trending(context.Background(), "week", 20)
	if err != nil || items[0].Title != "Приклад" || calls.Load() != 1 {
		t.Fatalf("listing did not reuse translation: %+v %v", items, err)
	}
}
