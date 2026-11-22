package tmdb

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"
)

// Called before serving. Import the legacy file without replacing newer database
// rows, then warm the bounded in-memory catalog. The database has no 10k limit.
func (c *Client) ConfigureTranslationDatabase(ctx context.Context, db *sql.DB) error {
	if db == nil {
		return nil
	}
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	if _, err := db.ExecContext(ctx, "select 1 from title_translations limit 0"); err != nil {
		return fmt.Errorf("title translations require migration 024: %w", err)
	}
	c.catalog.mu.RLock()
	legacy := make([]catalogEntry, 0)
	for _, entry := range c.catalog.entries {
		if entry.Translation != nil && (entry.Translation.Title != "" || entry.Translation.Overview != "") {
			legacy = append(legacy, entry)
		}
	}
	c.catalog.mu.RUnlock()
	if err := writeTranslations(ctx, db, legacy, true); err != nil {
		return fmt.Errorf("import file translations: %w", err)
	}
	rows, err := db.QueryContext(ctx, translationSelect+" order by updated_at desc limit $1", maxCatalogTitles)
	if err != nil {
		return err
	}
	entries, err := readTranslations(rows)
	if err != nil {
		return err
	}
	c.catalog.mu.Lock()
	c.catalog.database = db
	c.catalog.pending = make(map[string]catalogEntry)
	for key, entry := range entries {
		if _, exists := c.catalog.entries[key]; !exists && len(c.catalog.entries) >= maxCatalogTitles {
			continue
		}
		c.mergeStoredTranslation(key, entry)
	}
	c.catalog.mu.Unlock()
	return nil
}

const translationSelect = `select tmdb_id, media_type, source_title, source_overview,
 original_title, title, overview, provider, model, catalog_result, aliases, updated_at
 from title_translations where language = 'uk'`

func readTranslations(rows *sql.Rows) (map[string]catalogEntry, error) {
	defer rows.Close()
	out := make(map[string]catalogEntry)
	for rows.Next() {
		var id int
		var kind string
		var resultJSON, aliasesJSON []byte
		entry := catalogEntry{Translation: &translatedText{}}
		tr := entry.Translation
		if err := rows.Scan(&id, &kind, &tr.SourceTitle, &tr.SourceOverview, &tr.OriginalTitle, &tr.Title, &tr.Overview, &tr.Provider, &tr.Model, &resultJSON, &aliasesJSON, &entry.Updated); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(resultJSON, &entry.Result); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(aliasesJSON, &entry.Aliases); err != nil {
			return nil, err
		}
		entry.Result.ID, entry.Result.MediaType = id, kind
		out[searchKey(kind, id)] = entry
	}
	return out, rows.Err()
}

// Caller holds catalog.mu. Keep metadata learned from live TMDB responses; only
// the translation itself is refreshed from the shared database.
func (c *Client) mergeStoredTranslation(key string, stored catalogEntry) {
	current, exists := c.catalog.entries[key]
	if !exists {
		if len(c.catalog.entries) >= maxCatalogTitles {
			oldestKey := ""
			var oldest time.Time
			for k, e := range c.catalog.entries {
				if _, protected := c.catalog.overrides[k]; protected {
					continue
				}
				if oldestKey == "" || e.Updated.Before(oldest) {
					oldestKey, oldest = k, e.Updated
				}
			}
			if oldestKey == "" {
				return
			}
			delete(c.catalog.entries, oldestKey)
		}
		stored.Updated = time.Now()
		c.catalog.entries[key] = stored
		return
	}
	name := searchTitle(current.Result)
	wasGenerated := current.Translation != nil && current.Translation.Title != "" && name == current.Translation.Title
	if wasGenerated || !nativeUkrainian(map[string]any{"title": name}, "title") {
		current.Result = stored.Result
	}
	if current.Result.OriginalTitle == "" {
		current.Result.OriginalTitle = stored.Result.OriginalTitle
	}
	if current.Result.OriginalName == "" {
		current.Result.OriginalName = stored.Result.OriginalName
	}
	current.Translation = stored.Translation
	current.Aliases = uniqueTitles(append(current.Aliases, stored.Aliases...))
	if searchTitle(current.Result) == "" {
		current.Result = stored.Result
	}
	c.catalog.entries[key] = current
}

func (c *Client) hydrateTranslations(ctx context.Context, nodes []textNode) {
	c.catalog.mu.RLock()
	db := c.catalog.database
	c.catalog.mu.RUnlock()
	if db == nil {
		return
	}
	type identity struct {
		ID   int    `json:"id"`
		Kind string `json:"kind"`
	}
	ids := make([]identity, 0, len(nodes))
	seen := make(map[string]bool)
	for _, node := range nodes {
		id, _ := node.data["id"].(float64)
		if id <= 0 || (node.kind != "movie" && node.kind != "tv") || node.data["episode_number"] != nil || node.data["season_number"] != nil {
			continue
		}
		key := searchKey(node.kind, int(id))
		if !seen[key] {
			ids = append(ids, identity{int(id), node.kind})
			seen[key] = true
		}
	}
	if len(ids) == 0 {
		return
	}
	encoded, err := json.Marshal(ids)
	if err != nil {
		return
	}
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	rows, err := db.QueryContext(ctx, translationSelect+` and (tmdb_id, media_type) in (select id, kind from jsonb_to_recordset($1::jsonb) as x(id integer, kind text))`, string(encoded))
	if err != nil {
		log.Printf("translation database read: %v", err)
		return
	}
	entries, err := readTranslations(rows)
	if err != nil {
		log.Printf("translation database decode: %v", err)
		return
	}
	c.catalog.mu.Lock()
	defer c.catalog.mu.Unlock()
	for key, entry := range entries {
		if _, pending := c.catalog.pending[key]; !pending {
			// remember() will bound the catalog as live nodes are processed.
			c.mergeStoredTranslation(key, entry)
		}
	}
}

// Caller holds catalog.mu; entries/translation pointers are immutable snapshots.
func (t *titleCatalog) queueTranslation(key string, entry catalogEntry) {
	if t.database == nil {
		return
	}
	if t.pending == nil {
		t.pending = make(map[string]catalogEntry)
	}
	if previous, exists := t.pending[key]; exists {
		merged := *entry.Translation
		if merged.Title == "" {
			merged.Title, merged.SourceTitle = previous.Translation.Title, previous.Translation.SourceTitle
		}
		if merged.Overview == "" {
			merged.Overview, merged.SourceOverview = previous.Translation.Overview, previous.Translation.SourceOverview
		}
		entry.Translation = &merged
	}
	t.pending[key] = entry
}

func (c *Client) flushTranslationDatabase() error {
	t := &c.catalog
	t.mu.RLock()
	db := t.database
	pending := make(map[string]catalogEntry, len(t.pending))
	entries := make([]catalogEntry, 0, len(t.pending))
	for key, entry := range t.pending {
		pending[key] = entry
		entries = append(entries, entry)
	}
	t.mu.RUnlock()
	if db == nil || len(entries) == 0 {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := writeTranslations(ctx, db, entries, false); err != nil {
		return err
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	for key, entry := range pending {
		if t.pending[key].Translation == entry.Translation {
			delete(t.pending, key)
		}
	}
	return nil
}

func writeTranslations(ctx context.Context, db *sql.DB, entries []catalogEntry, importOnly bool) error {
	if len(entries) == 0 {
		return nil
	}
	data, err := json.Marshal(entries)
	if err != nil {
		return err
	}
	query := `insert into title_translations as existing
 (tmdb_id, media_type, source_title, source_overview, original_title, title, overview, provider, model, catalog_result, aliases)
 select (e->'result'->>'id')::integer, e->'result'->>'media_type',
 coalesce(e->'translation'->>'sourceTitle',''), coalesce(e->'translation'->>'sourceOverview',''),
 coalesce(e->'translation'->>'originalTitle',''), coalesce(e->'translation'->>'title',''), coalesce(e->'translation'->>'overview',''),
 coalesce(e->'translation'->>'provider','gemini'), coalesce(e->'translation'->>'model',''), e->'result', coalesce(nullif(e->'aliases','null'::jsonb),'[]'::jsonb)
 from jsonb_array_elements($1::jsonb) as e
 on conflict (tmdb_id, media_type, language) `
	if importOnly {
		query += "do nothing"
	} else {
		// Partial batches cannot erase a description written by another server.
		query += `do update set
 source_title = case when excluded.title <> '' then excluded.source_title else existing.source_title end,
 title = case when excluded.title <> '' then excluded.title else existing.title end,
 source_overview = case when excluded.overview <> '' then excluded.source_overview else existing.source_overview end,
 overview = case when excluded.overview <> '' then excluded.overview else existing.overview end,
 original_title = coalesce(nullif(excluded.original_title,''), existing.original_title),
 provider = excluded.provider, model = excluded.model, catalog_result = excluded.catalog_result,
 aliases = coalesce((select jsonb_agg(distinct value) from jsonb_array_elements(existing.aliases || excluded.aliases)), '[]'::jsonb), updated_at = now()`
	}
	_, err = db.ExecContext(ctx, query, string(data))
	return err
}

func translationInfo(fields []string, original string) *TranslationInfo {
	info := &TranslationInfo{Fields: fields, OriginalTitle: original}
	for _, field := range fields {
		info.TitleIsMachineTranslated = info.TitleIsMachineTranslated || field == "title"
		info.OverviewIsMachineTranslated = info.OverviewIsMachineTranslated || field == "overview"
	}
	return info
}
