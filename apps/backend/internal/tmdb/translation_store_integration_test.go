package tmdb

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func TestPostgresTranslationsSurviveRestartAndReachOtherReplicas(t *testing.T) {
	dsn := os.Getenv("TMDB_TRANSLATION_TEST_DSN")
	if dsn == "" {
		t.Skip("set TMDB_TRANSLATION_TEST_DSN to an isolated test PostgreSQL")
	}
	ctx := context.Background()
	admin, err := sql.Open("pgx", dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	schema := fmt.Sprintf("translation_test_%d", time.Now().UnixNano())
	if _, err := admin.Exec("create schema " + schema); err != nil {
		t.Fatal(err)
	}
	defer admin.Exec("drop schema " + schema + " cascade")
	u, err := url.Parse(dsn)
	if err != nil {
		t.Fatal(err)
	}
	q := u.Query()
	q.Set("search_path", schema)
	u.RawQuery = q.Encode()
	db, err := sql.Open("pgx", u.String())
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	migration, err := os.ReadFile("../../migrations/024_title_translations.sql")
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 2; i++ {
		if _, err := db.Exec(string(migration)); err != nil {
			t.Fatal(err)
		}
	}
	var official atomic.Bool
	handler := func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/movie/42" {
			fmt.Fprint(w, `{"id":42,"title":"Title","overview":"A synopsis.","translations":{"translations":[]}}`)
			return
		}
		if official.Load() {
			fmt.Fprint(w, `{"id":442269,"title":"Офіційна назва","overview":"Офіційний український опис.","translations":{"translations":[]}}`)
		} else {
			fmt.Fprint(w, `{"id":442269,"title":"Jean-Marc ou La Vie conjugale","original_title":"Jean-Marc ou La Vie conjugale","original_language":"fr","overview":"The story of a couple.","translations":{"translations":[]}}`)
		}
	}
	writer := localizedTestClient(t, handler)
	legacyPath := filepath.Join(t.TempDir(), "titles.json")
	if err := writer.ConfigureTitleCatalog(legacyPath, ""); err != nil {
		t.Fatal(err)
	}
	var calls atomic.Int32
	enableTestTranslation(writer, func(context.Context, translationInput) (translationInput, error) {
		calls.Add(1)
		return translationInput{Title: "Жан-Марк або Подружнє життя", Overview: "Історія подружжя."}, nil
	})
	// Generate into the legacy file first and migrate it to the database.
	if _, err := writer.DetailsByID(ctx, 442269, "movie"); err != nil {
		t.Fatal(err)
	}
	if err := writer.ConfigureTranslationDatabase(ctx, db); err != nil {
		t.Fatal(err)
	}
	var titleFlag, overviewFlag bool
	var source string
	if err := db.QueryRow(`select title_is_machine_translated, overview_is_machine_translated, source_overview from title_translations where tmdb_id=442269`).Scan(&titleFlag, &overviewFlag, &source); err != nil || !titleFlag || !overviewFlag || source != "The story of a couple." {
		t.Fatalf("database flags/source: %v %v %q %v", titleFlag, overviewFlag, source, err)
	}
	// No file or generator on a new process: read durable translations.
	reader := localizedTestClient(t, handler)
	if err := reader.ConfigureTitleCatalog("", ""); err != nil {
		t.Fatal(err)
	}
	if err := reader.ConfigureTranslationDatabase(ctx, db); err != nil {
		t.Fatal(err)
	}
	detail, err := reader.DetailsByID(ctx, 442269, "movie")
	if err != nil || detail.Title != "Жан-Марк або Подружнє життя" || detail.Overview != "Історія подружжя." || detail.Translation == nil || !detail.Translation.TitleIsMachineTranslated || !detail.Translation.OverviewIsMachineTranslated {
		t.Fatalf("restart: %+v %v", detail, err)
	}
	saved := reader.LocalizeTitles(ctx, []Suggestion{{ID: 442269, MediaType: "movie", Title: "Jean-Marc ou La Vie conjugale"}})
	if saved[0].Translation == nil || !saved[0].Translation.TitleIsMachineTranslated || saved[0].Translation.OverviewIsMachineTranslated {
		t.Fatalf("saved provenance: %+v", saved[0])
	}
	// A title-only write from another process preserves the saved description.
	entry := writer.catalog.entries["movie:442269"]
	entry.Translation = &translatedText{Title: "Оновлена назва", SourceTitle: "Jean-Marc ou La Vie conjugale", OriginalTitle: "Jean-Marc ou La Vie conjugale"}
	entry.Result.Title = "Оновлена назва"
	if err := writeTranslations(ctx, db, []catalogEntry{entry}, false); err != nil {
		t.Fatal(err)
	}
	saved = reader.LocalizeTitles(ctx, []Suggestion{{ID: 442269, MediaType: "movie", Title: "Jean-Marc ou La Vie conjugale"}})
	if saved[0].Title != "Оновлена назва" || saved[0].Translation == nil {
		t.Fatalf("saved list missed replica update: %+v", saved[0])
	}
	detail, err = reader.DetailsByID(ctx, 442269, "movie")
	if err != nil || detail.Title != "Оновлена назва" || detail.Overview != "Історія подружжя." {
		t.Fatalf("replica refresh/partial write: %+v %v", detail, err)
	}
	// Re-importing an old local file must not overwrite a newer database row.
	restarted := localizedTestClient(t, handler)
	if err := restarted.ConfigureTitleCatalog(legacyPath, ""); err != nil {
		t.Fatal(err)
	}
	if err := restarted.ConfigureTranslationDatabase(ctx, db); err != nil {
		t.Fatal(err)
	}
	detail, err = restarted.DetailsByID(ctx, 442269, "movie")
	if err != nil || detail.Title != "Оновлена назва" {
		t.Fatalf("stale import: %+v %v", detail, err)
	}
	// Fresh generated output takes the same durable path as the legacy import.
	writer.catalog.path = ""
	if _, err := writer.DetailsByID(ctx, 42, "movie"); err != nil {
		t.Fatal(err)
	}
	var persisted string
	if err := db.QueryRow(`select overview from title_translations where tmdb_id=42 and media_type='movie'`).Scan(&persisted); err != nil || persisted != "Історія подружжя." {
		t.Fatalf("new generation not persisted: %q %v", persisted, err)
	}
	// Actual generated output is written immediately, even with file caching off.
	writer.catalog.mu.Lock()
	writer.catalog.queueTranslation("movie:42", catalogEntry{Result: searchResult{ID: 42, MediaType: "movie", Title: "Назва"}, Aliases: []string{"Назва"}, Translation: &translatedText{Title: "Назва", SourceTitle: "Title"}})
	writer.catalog.mu.Unlock()
	if err := writer.FlushTitleCatalog(); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`select title_is_machine_translated, overview_is_machine_translated from title_translations where tmdb_id=42`).Scan(&titleFlag, &overviewFlag); err != nil || !titleFlag || !overviewFlag {
		t.Fatalf("partial flags: %v %v %v", titleFlag, overviewFlag, err)
	}
	// Failed writes remain pending and can be retried after the connection recovers.
	closed, _ := sql.Open("pgx", u.String())
	closed.Close()
	writer.catalog.mu.Lock()
	writer.catalog.database = closed
	writer.catalog.queueTranslation("tv:42", catalogEntry{Result: searchResult{ID: 42, MediaType: "tv"}, Aliases: []string{}, Translation: &translatedText{Title: "Серіал", SourceTitle: "Series"}})
	writer.catalog.mu.Unlock()
	if err := writer.FlushTitleCatalog(); err == nil {
		t.Fatal("failed database write was hidden")
	}
	writer.catalog.mu.Lock()
	writer.catalog.database = db
	writer.catalog.mu.Unlock()
	if err := writer.FlushTitleCatalog(); err != nil {
		t.Fatal(err)
	}
	var count int
	if err := db.QueryRow(`select count(*) from title_translations where tmdb_id=42`).Scan(&count); err != nil || count != 2 {
		t.Fatalf("retry/media identity: %d %v", count, err)
	}
	official.Store(true)
	detail, err = reader.DetailsByID(ctx, 442269, "movie")
	if err != nil || detail.Title != "Офіційна назва" || detail.Overview != "Офіційний український опис." || detail.Translation != nil {
		t.Fatalf("official priority: %+v %v", detail, err)
	}
	if calls.Load() != 2 {
		t.Fatalf("unnecessary model calls: %d", calls.Load())
	}
}
