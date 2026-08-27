package httpapi

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/saved"
)

// The genre filter and the "recently added" sort on the saved page read these
// two fields straight off the list response; both were missing from the payload
// before the redesign.
func TestMapSavedItemSerializesGenresAndCreatedAt(t *testing.T) {
	created := time.Date(2026, 8, 1, 9, 30, 0, 0, time.UTC)
	item := mapSavedItem(saved.Title{
		TMDBID:    1,
		MediaType: "movie",
		Title:     "Дюна",
		Status:    "upcoming",
		ListTypes: []string{"follow"},
		Genres:    []string{"Фантастика", "Драма"},
		CreatedAt: created,
	})

	if len(item.Genres) != 2 || item.Genres[0] != "Фантастика" {
		t.Fatalf("genres not carried over: %#v", item.Genres)
	}
	if item.CreatedAt != created.Format(time.RFC3339) {
		t.Fatalf("createdAt = %q, want %q", item.CreatedAt, created.Format(time.RFC3339))
	}

	encoded, err := json.Marshal(item)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}
	if _, ok := decoded["genres"]; !ok {
		t.Fatalf("genres missing from JSON: %s", encoded)
	}
	if _, ok := decoded["createdAt"]; !ok {
		t.Fatalf("createdAt missing from JSON: %s", encoded)
	}
}

// A title saved before the genres column existed must not grow an empty array
// in the payload — the client hides the genre row on absence, not on [].
func TestMapSavedItemOmitsEmptyGenres(t *testing.T) {
	encoded, err := json.Marshal(mapSavedItem(saved.Title{
		TMDBID:    2,
		MediaType: "tv",
		Title:     "Без жанрів",
		Status:    "upcoming",
	}))
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}
	if _, ok := decoded["genres"]; ok {
		t.Fatalf("empty genres should be omitted: %s", encoded)
	}
}
