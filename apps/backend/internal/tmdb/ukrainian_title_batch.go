package tmdb

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"
)

type titleTranslationCandidate struct {
	Key      string
	Source   string
	Original string
}

// LocalizeTitles refreshes display names stored outside TMDB (e.g. saved lists).
// It changes only names, never list membership, ratings or release metadata.
func (c *Client) LocalizeTitles(ctx context.Context, items []Suggestion) []Suggestion {
	out := append([]Suggestion(nil), items...)
	nodes := make([]textNode, len(items))
	for i, item := range items {
		nodes[i] = textNode{data: map[string]any{"id": float64(item.ID)}, kind: item.MediaType}
	}
	c.hydrateTranslations(ctx, nodes)
	for i, item := range items {
		field := "title"
		if item.MediaType == "tv" {
			field = "name"
		}
		key := searchKey(item.MediaType, item.ID)
		c.catalog.mu.RLock()
		entry := c.catalog.entries[key]
		c.catalog.mu.RUnlock()
		name := item.Title
		if localized := searchTitle(entry.Result); !nativeUkrainian(map[string]any{field: name}, field) && nativeUkrainian(map[string]any{field: localized}, field) {
			name = localized
		}
		original := entry.Result.OriginalTitle
		if item.MediaType == "tv" {
			original = entry.Result.OriginalName
		}
		data := map[string]any{"id": float64(item.ID), field: name, "original_" + field: original, "original_language": entry.Result.OriginalLanguage}
		nodes[i] = textNode{data: data, kind: item.MediaType, key: key, fields: []string{field}, aliases: []string{item.Title}}
		c.catalog.applyOverride(data, item.MediaType)
		c.catalog.remember(nodes[i])
		c.applyMachineTranslation(ctx, nodes[i], false)
	}
	c.translateListTitles(ctx, nodes)
	for i, node := range nodes {
		c.applyMachineTranslation(ctx, node, false)
		out[i].Title = text(node.data, node.fields[0])
		out[i].Translation, _ = node.data["dropdate_translation"].(*TranslationInfo)
		// Persisted lists may already contain the generated name. Preserve its
		// provenance even when no text replacement was necessary on this read.
		c.catalog.mu.RLock()
		entry, override := c.catalog.entries[node.key], c.catalog.overrides[node.key]
		c.catalog.mu.RUnlock()
		if out[i].Translation == nil && override.Title == "" && entry.Translation != nil && entry.Translation.Title != "" && out[i].Title == entry.Translation.Title {
			out[i].Translation = translationInfo([]string{"title"}, entry.Translation.OriginalTitle)
		}
		c.catalog.remember(node)
	}
	return out
}

// Translate new list titles together, without fetching every detail record or
// making a model request per card. Descriptions still use the detail workflow.
func (c *Client) translateListTitles(ctx context.Context, nodes []textNode) {
	m := c.machine
	if m == nil || m.translateTitles == nil {
		return
	}
	candidates := make([]titleTranslationCandidate, 0)
	seen := make(map[string]bool)
	for _, node := range nodes {
		if node.data["translations"] != nil || node.data["episode_number"] != nil || node.data["season_number"] != nil {
			continue
		}
		id, _ := node.data["id"].(float64)
		if id <= 0 || (node.kind != "movie" && node.kind != "tv") {
			continue
		}
		field := "title"
		if node.kind == "tv" {
			field = "name"
		}
		if nativeUkrainian(node.data, field) {
			continue
		}
		key := searchKey(node.kind, int(id))
		if seen[key] {
			continue
		}
		seen[key] = true
		c.catalog.mu.RLock()
		entry, override := c.catalog.entries[key], c.catalog.overrides[key]
		c.catalog.mu.RUnlock()
		if override.Title != "" {
			continue
		}
		source, original := text(node.data, field), text(node.data, "original_"+field)
		if source == "" || len([]rune(source)) > 500 || len([]rune(original)) > 500 {
			continue
		}
		cached := entry.Translation
		if cached != nil && cached.Title != "" && (cached.SourceTitle == source || (original != "" && original == cached.OriginalTitle)) {
			continue
		}
		candidates = append(candidates, titleTranslationCandidate{key, source, original})
		// Bound even very large filmographies. Standard TMDB pages contain 20 items.
		if len(candidates) == 50 {
			break
		}
	}
	if len(candidates) == 0 {
		return
	}
	sort.Slice(candidates, func(i, j int) bool { return candidates[i].Key < candidates[j].Key })
	encoded, _ := json.Marshal(candidates)
	key := fmt.Sprintf("titles:%x", sha256.Sum256(encoded))
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	result := m.flights.DoChan(key, func() (any, error) {
		// Recheck inside singleflight: another response may have filled the cache.
		pending := make([]titleTranslationCandidate, 0, len(candidates))
		c.catalog.mu.RLock()
		for _, item := range candidates {
			cached := c.catalog.entries[item.Key].Translation
			if cached == nil || cached.Title == "" || (cached.SourceTitle != item.Source && (item.Original == "" || cached.OriginalTitle != item.Original)) {
				pending = append(pending, item)
			}
		}
		c.catalog.mu.RUnlock()
		if len(pending) == 0 || !m.reserve(key) {
			return nil, nil
		}
		defer func() { <-m.slots }()
		input := make([]string, len(pending))
		for i, item := range pending {
			input[i] = item.Original
			if input[i] == "" {
				input[i] = item.Source
			}
		}
		translated, err := m.translateTitles(ctx, input)
		if err == nil && len(translated) != len(input) {
			err = fmt.Errorf("title batch length mismatch")
		}
		if err != nil {
			m.failed(key, err)
			return nil, nil
		}
		for i, item := range pending {
			title := strings.TrimSpace(translated[i])
			if err := validateTranslation(translationInput{Title: input[i]}, translationInput{Title: title}); err != nil {
				m.failed(key, err)
				continue
			}
			c.catalog.mu.Lock()
			entry, exists := c.catalog.entries[item.Key]
			if exists {
				// Never erase an overview already translated by an overlapping detail request.
				cached := translatedText{}
				if entry.Translation != nil {
					cached = *entry.Translation
				}
				cached.SourceTitle, cached.OriginalTitle, cached.Title = item.Source, item.Original, title
				cached.Provider, cached.Model = "gemini", m.model
				entry.Translation = &cached
				entry.Aliases = uniqueTitles(append(entry.Aliases, title))
				entry.Result.Title = title
				entry.Result.Translation = translationInfo([]string{"title"}, item.Original)
				if entry.Result.MediaType == "tv" {
					entry.Result.Name = title
				}
				c.catalog.entries[item.Key] = entry
				patch := entry
				patch.Translation = &translatedText{SourceTitle: item.Source, OriginalTitle: item.Original, Title: title, Provider: "gemini", Model: m.model}
				c.catalog.queueTranslation(item.Key, patch)
				c.catalog.dirty = true
			}
			c.catalog.mu.Unlock()
		}
		if err := c.FlushTitleCatalog(); err != nil && m.logger != nil {
			m.logger.Printf("translation persistence: %v", err)
		}
		return nil, nil
	})
	select {
	case <-ctx.Done():
	case <-result:
	}
}
