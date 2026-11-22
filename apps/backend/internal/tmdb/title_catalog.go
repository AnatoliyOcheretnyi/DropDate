package tmdb

import (
	"context"
	"database/sql"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

//go:embed title_aliases.json
var bundledTitleAliases []byte

const maxCatalogTitles = 10000

// Editorial entries are keyed by identity, never by a guessed translation.
// An empty title leaves TMDB's display title intact; aliases only affect search.
type titleOverride struct {
	ID          int      `json:"id"`
	MediaType   string   `json:"mediaType"`
	Title       string   `json:"title,omitempty"`
	Overview    string   `json:"overview,omitempty"`
	Aliases     []string `json:"aliases"`
	SearchTitle string   `json:"searchTitle,omitempty"`
	Year        string   `json:"year,omitempty"`
	Source      string   `json:"source,omitempty"`
}

type catalogEntry struct {
	Result      searchResult    `json:"result"`
	Aliases     []string        `json:"aliases"`
	Updated     time.Time       `json:"updated"`
	Translation *translatedText `json:"translation,omitempty"`
}

type titleCatalog struct {
	mu        sync.RWMutex
	writeMu   sync.Mutex
	entries   map[string]catalogEntry
	overrides map[string]titleOverride
	path      string
	dirty     bool
	database  *sql.DB
	pending   map[string]catalogEntry
}

// ConfigureTitleCatalog is called once before serving requests. The learned
// catalog is optional: a read-only filesystem must not disable TMDB itself.
func (c *Client) ConfigureTitleCatalog(cachePath, overridesPath string) error {
	t := &c.catalog
	t.mu.Lock()
	defer t.mu.Unlock()
	t.path = cachePath
	t.entries = make(map[string]catalogEntry)
	t.overrides = make(map[string]titleOverride)
	var loadErr error
	if cachePath != "" {
		data, err := os.ReadFile(cachePath)
		if err == nil {
			var entries []catalogEntry
			if err = json.Unmarshal(data, &entries); err == nil {
				for _, entry := range entries {
					if len(t.entries) >= maxCatalogTitles {
						break
					}
					if entry.Result.ID > 0 && (entry.Result.MediaType == "movie" || entry.Result.MediaType == "tv") {
						t.entries[searchKey(entry.Result.MediaType, entry.Result.ID)] = entry
					}
				}
			} else {
				loadErr = err
			}
		} else if !errors.Is(err, os.ErrNotExist) {
			loadErr = err
		}
	}
	apply := func(data []byte) error {
		var entries []titleOverride
		if err := json.Unmarshal(data, &entries); err != nil {
			return err
		}
		for _, entry := range entries {
			if entry.ID <= 0 || (entry.MediaType != "movie" && entry.MediaType != "tv") {
				return fmt.Errorf("invalid title alias identity: %s:%d", entry.MediaType, entry.ID)
			}
			key := searchKey(entry.MediaType, entry.ID)
			t.overrides[key] = entry
			known := t.entries[key]
			known.Result.ID, known.Result.MediaType = entry.ID, entry.MediaType
			if entry.Title != "" {
				known.Result.Title = entry.Title
			} else if searchTitle(known.Result) == "" {
				known.Result.Title = entry.SearchTitle
			}
			if known.Result.ReleaseDate == "" {
				known.Result.ReleaseDate = entry.Year
			}
			known.Aliases = uniqueTitles(append(known.Aliases, entry.Aliases...))
			known.Updated = time.Now()
			t.entries[key] = known
		}
		return nil
	}
	if err := apply(bundledTitleAliases); err != nil {
		return err
	}
	if overridesPath != "" {
		data, err := os.ReadFile(overridesPath)
		if err != nil {
			return err
		}
		if err := apply(data); err != nil {
			return err
		}
	}
	return loadErr
}

func (c *Client) FlushTitleCatalog() error {
	t := &c.catalog
	t.writeMu.Lock()
	defer t.writeMu.Unlock()
	dbErr := c.flushTranslationDatabase()
	t.mu.Lock()
	if t.path == "" || !t.dirty {
		t.mu.Unlock()
		return dbErr
	}
	path := t.path
	entries := make([]catalogEntry, 0, len(t.entries))
	for _, entry := range t.entries {
		entries = append(entries, entry)
	}
	t.dirty = false
	t.mu.Unlock()
	err := writeCatalog(path, entries)
	if err != nil {
		t.mu.Lock()
		t.dirty = true
		t.mu.Unlock()
	}
	return errors.Join(dbErr, err)
}

func writeCatalog(path string, entries []catalogEntry) error {
	data, err := json.Marshal(entries)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	f, err := os.CreateTemp(filepath.Dir(path), ".titles-*.json")
	if err != nil {
		return err
	}
	defer os.Remove(f.Name())
	if _, err = f.Write(data); err != nil {
		f.Close()
		return err
	}
	if err = f.Close(); err != nil {
		return err
	}
	return os.Rename(f.Name(), path)
}

func titleAliases(m map[string]any) []string {
	values := []string{text(m, "title"), text(m, "name"), text(m, "original_title"), text(m, "original_name")}
	if translations, ok := m["translations"].(map[string]any); ok {
		items, _ := translations["translations"].([]any)
		for _, item := range items {
			tr, _ := item.(map[string]any)
			if lang := text(tr, "iso_639_1"); lang != "uk" && lang != "en" {
				continue
			}
			data, _ := tr["data"].(map[string]any)
			values = append(values, text(data, "title"), text(data, "name"))
		}
	}
	if alternatives, ok := m["alternative_titles"].(map[string]any); ok {
		for _, field := range []string{"titles", "results"} {
			items, _ := alternatives[field].([]any)
			for _, item := range items {
				alt, _ := item.(map[string]any)
				values = append(values, text(alt, "title"))
			}
		}
	}
	return uniqueTitles(values)
}

func uniqueTitles(values []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" && !seen[value] {
			out = append(out, value)
			seen[value] = true
		}
		if len(out) >= 64 {
			break
		}
	}
	return out
}

func (t *titleCatalog) applyOverride(m map[string]any, kind string) {
	id, _ := m["id"].(float64)
	// TMDB episode and season IDs live in separate namespaces.
	if m["episode_number"] != nil || m["season_number"] != nil {
		return
	}
	t.mu.RLock()
	entry, ok := t.overrides[searchKey(kind, int(id))]
	t.mu.RUnlock()
	if !ok {
		return
	}
	if entry.Title != "" {
		if kind == "tv" {
			m["name"] = entry.Title
		} else {
			m["title"] = entry.Title
		}
	}
	if entry.Overview != "" {
		m["overview"] = entry.Overview
	}
}

func (t *titleCatalog) remember(node textNode) {
	m := node.data
	if adult, _ := m["adult"].(bool); adult {
		return
	}
	if m["episode_number"] != nil || m["season_number"] != nil {
		return
	}
	id, _ := m["id"].(float64)
	if id <= 0 || (node.kind != "movie" && node.kind != "tv") {
		return
	}
	result := searchResult{ID: int(id), MediaType: node.kind, Title: text(m, "title"), Name: text(m, "name"), OriginalTitle: text(m, "original_title"), OriginalName: text(m, "original_name"), OriginalLanguage: text(m, "original_language"), ReleaseDate: text(m, "release_date"), FirstAirDate: text(m, "first_air_date"), PosterPath: text(m, "poster_path")}
	if info, ok := m["dropdate_translation"].(*TranslationInfo); ok && info.TitleIsMachineTranslated {
		result.Translation = translationInfo([]string{"title"}, info.OriginalTitle)
	}
	if searchTitle(result) == "" {
		return
	}
	key := searchKey(node.kind, int(id))
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.entries == nil {
		t.entries = make(map[string]catalogEntry)
	}
	previous, exists := t.entries[key]
	if !exists && len(t.entries) >= maxCatalogTitles {
		oldestKey := ""
		var oldest time.Time
		for k, v := range t.entries {
			if _, protected := t.overrides[k]; protected {
				continue
			}
			if oldestKey == "" || v.Updated.Before(oldest) {
				oldestKey, oldest = k, v.Updated
			}
		}
		if oldestKey == "" {
			return
		}
		delete(t.entries, oldestKey)
	}
	// Sparse list results must not erase identity/metadata learned from details.
	if result.OriginalTitle == "" {
		result.OriginalTitle = previous.Result.OriginalTitle
	}
	if result.OriginalName == "" {
		result.OriginalName = previous.Result.OriginalName
	}
	if result.PosterPath == "" {
		result.PosterPath = previous.Result.PosterPath
	}
	if result.ReleaseDate == "" {
		result.ReleaseDate = previous.Result.ReleaseDate
	}
	if result.FirstAirDate == "" {
		result.FirstAirDate = previous.Result.FirstAirDate
	}
	aliases := append(append([]string{}, previous.Aliases...), node.aliases...)
	aliases = append(aliases, searchTitle(result))
	t.entries[key] = catalogEntry{Result: result, Aliases: uniqueTitles(aliases), Updated: time.Now(), Translation: previous.Translation}
	t.dirty = true
}

// Apostrophe variants, dashes, accents and case should not change a title match.
func normalizeTitle(query string) string {
	var out strings.Builder
	for _, r := range norm.NFD.String(strings.ToLower(query)) {
		if unicode.Is(unicode.Mn, r) || strings.ContainsRune("'’ʼ`", r) {
			continue
		}
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			out.WriteRune(r)
		} else {
			out.WriteByte(' ')
		}
	}
	return strings.Join(strings.Fields(out.String()), " ")
}

func titleMatch(query, candidate string) int {
	if query == candidate {
		return 3
	}
	if len([]rune(query)) >= 3 && strings.Contains(candidate, query) {
		return 2
	}
	// One edit (including a transposition), only on reasonably long whole titles.
	a, b := []rune(query), []rune(candidate)
	if len(a) < 5 || len(a)-len(b) > 1 || len(b)-len(a) > 1 {
		return 0
	}
	i := 0
	for i < len(a) && i < len(b) && a[i] == b[i] {
		i++
	}
	if len(a) == len(b) {
		if string(a[i+1:]) == string(b[i+1:]) {
			return 1
		}
		if i+1 < len(a) && a[i] == b[i+1] && a[i+1] == b[i] && string(a[i+2:]) == string(b[i+2:]) {
			return 1
		}
	} else if len(a) > len(b) {
		if string(a[i+1:]) == string(b[i:]) {
			return 1
		}
	} else if string(a[i:]) == string(b[i+1:]) {
		return 1
	}
	return 0
}

func (t *titleCatalog) search(query string) []searchResult {
	query = normalizeTitle(query)
	if query == "" {
		return nil
	}
	type match struct {
		result searchResult
		score  int
	}
	matches := []match{}
	t.mu.RLock()
	for _, entry := range t.entries {
		best := 0
		for _, alias := range entry.Aliases {
			if score := titleMatch(query, normalizeTitle(alias)); score > best {
				best = score
			}
		}
		if best > 0 && searchTitle(entry.Result) != "" {
			matches = append(matches, match{entry.Result, best})
		}
	}
	t.mu.RUnlock()
	sort.Slice(matches, func(i, j int) bool {
		if matches[i].score != matches[j].score {
			return matches[i].score > matches[j].score
		}
		return searchKey(matches[i].result.MediaType, matches[i].result.ID) < searchKey(matches[j].result.MediaType, matches[j].result.ID)
	})
	out := make([]searchResult, 0, len(matches))
	for _, m := range matches {
		out = append(out, m.result)
	}
	return out
}

func (c *Client) searchWithAliases(ctx context.Context, query string, page int) (multiSearchResponse, error) {
	query = strings.Join(strings.Fields(query), " ")
	if page < 1 {
		page = 1
	}
	local := c.catalog.search(query)
	remotePage := page
	if len(local) > 0 {
		remotePage = 1
	}
	payload, err := c.searchPageLanguage(ctx, query, remotePage, "uk-UA")
	if ctx.Err() != nil {
		return multiSearchResponse{}, ctx.Err()
	}
	if len(local) == 0 {
		return payload, err
	}
	// Preserve upstream pagination for broad searches. A small remote result set
	// can be merged with aliases and then paginated consistently by this client.
	if err == nil && payload.TotalPages > 1 {
		if page != remotePage {
			return c.searchPageLanguage(ctx, query, page, "uk-UA")
		}
		return payload, nil
	}
	local = c.catalog.search(query) // include metadata learned from this response
	seen := map[string]bool{}
	merged := make([]searchResult, 0, len(local)+len(payload.Results))
	for _, result := range append(local, payload.Results...) {
		key := searchKey(result.MediaType, result.ID)
		if !seen[key] {
			seen[key] = true
			merged = append(merged, result)
		}
	}
	total := len(merged)
	start := total
	if page <= (total+19)/20 {
		start = (page - 1) * 20
	}
	end := start + 20
	if end > total {
		end = total
	}
	return multiSearchResponse{Results: merged[start:end], Page: page, TotalPages: (total + 19) / 20, TotalResults: total}, nil
}
