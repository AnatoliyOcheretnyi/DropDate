package tmdb

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode"

	"golang.org/x/sync/singleflight"
)

// Resolve text at the TMDB boundary so discovery, details, episodes, search and
// recommendations all use the same policy. Only text is merged; dates, IDs and
// other metadata always come from the original response.
type textLocalization struct {
	mu      sync.Mutex
	cache   map[string]textCacheEntry
	flights singleflight.Group
}

type textCacheEntry struct {
	data    map[string]any
	expires time.Time
}

func text(m map[string]any, key string) string {
	v, _ := m[key].(string)
	return strings.TrimSpace(v)
}

func unsupportedScript(value string) bool {
	readable, other := 0, 0
	for _, r := range value {
		if unicode.IsLetter(r) {
			if unicode.In(r, unicode.Latin, unicode.Cyrillic) {
				readable++
			} else {
				other++
			}
		}
	}
	return other > readable
}

func missingText(value string) bool {
	return strings.TrimSpace(value) == "" || looksRussian(value) || unsupportedScript(value)
}

func titleNeedsFallback(m map[string]any, field string) bool {
	v := text(m, field)
	if missingText(v) {
		return true
	}
	lang := text(m, "original_language")
	return lang != "" && lang != "uk" && lang != "en" && v == text(m, "original_"+field)
}

type textNode struct {
	data    map[string]any
	kind    string
	key     string
	fields  []string
	aliases []string
}

func responseNodes(req *http.Request, payload map[string]any) []textNode {
	parts := strings.Split(strings.Trim(req.URL.Path, "/"), "/")
	kind := ""
	id := 0
	for i, p := range parts {
		if p == "movie" || p == "tv" {
			kind = p
			if i+1 < len(parts) {
				id, _ = strconv.Atoi(parts[i+1])
			}
			break
		}
	}
	var nodes []textNode
	var visit func(map[string]any, string, string, bool)
	visit = func(m map[string]any, inherited, location string, root bool) {
		k := text(m, "media_type")
		if k == "" {
			k = inherited
		}
		if _, ok := m["title"]; ok {
			k = "movie"
		}
		if _, ok := m["first_air_date"]; ok {
			k = "tv"
		}
		if _, ok := m["original_name"]; ok && k != "person" {
			k = "tv"
		}
		_, episode := m["episode_number"]
		_, season := m["season_number"]
		_, title := m["title"]
		_, name := m["name"]
		isTitle := k != "person" && (title || (name && (k == "tv" || episode || season)))
		if isTitle {
			key := location
			if mid, ok := m["id"].(float64); ok {
				key = fmt.Sprintf("%s:%g", k, mid)
			}
			if root && id > 0 && !episode && !season && m["id"] == nil {
				key = fmt.Sprintf("%s:%d", k, id)
			}
			fields := []string{}
			for _, f := range []string{"title", "name", "overview", "tagline"} {
				if value, ok := m[f]; ok && (value == nil || isText(value)) {
					fields = append(fields, f)
				}
			}
			nodes = append(nodes, textNode{m, k, key, fields, titleAliases(m)})
		}
		// Never walk translations, genres, companies or actor names as titles.
		for _, field := range []string{"results", "cast", "crew", "known_for", "episodes", "seasons", "next_episode_to_air", "last_episode_to_air", "combined_credits"} {
			switch children := m[field].(type) {
			case []any:
				for i, child := range children {
					if obj, ok := child.(map[string]any); ok {
						visit(obj, k, fmt.Sprintf("%s/%s/%d", location, field, i), false)
					}
				}
			case map[string]any:
				visit(children, k, location+"/"+field, false)
			}
		}
	}
	visit(payload, kind, "root", true)
	return nodes
}

func isText(value any) bool {
	_, ok := value.(string)
	return ok
}

func (c *Client) localizeResponse(req *http.Request, payload map[string]any) {
	nodes := responseNodes(req, payload)
	c.hydrateTranslations(req.Context(), nodes)
	needsEnglish := false
	for _, node := range nodes {
		// Details may already include translations; use them before another call.
		for _, language := range []string{"uk", "en"} {
			if translations, ok := node.data["translations"].(map[string]any); ok {
				items, _ := translations["translations"].([]any)
				for _, item := range items {
					tr, _ := item.(map[string]any)
					if text(tr, "iso_639_1") != language {
						continue
					}
					data, _ := tr["data"].(map[string]any)
					if language == "uk" {
						for _, field := range node.fields {
							if value := text(data, field); !missingText(value) {
								node.data[field] = value
							}
						}
					} else {
						mergeText(node, data)
					}
				}
			}
		}
		c.catalog.applyOverride(node.data, node.kind)
		for _, field := range node.fields {
			if (field == "title" || field == "name") && titleNeedsFallback(node.data, field) || (field != "title" && field != "name" && missingText(text(node.data, field))) {
				needsEnglish = true
			}
		}
	}
	if needsEnglish {
		if english := c.englishResponse(req); english != nil {
			byKey := map[string]textNode{}
			for _, node := range responseNodes(req, english) {
				byKey[node.key] = node
			}
			for i := range nodes {
				node := &nodes[i]
				fallback, found := byKey[node.key]
				if !found {
					continue
				}
				node.aliases = append(node.aliases, fallback.aliases...)
				mergeText(*node, fallback.data)
			}
		}
	}
	for _, node := range nodes {
		for _, field := range []string{"title", "name"} {
			if text(node.data, field) == "" && text(node.data, "original_"+field) != "" {
				node.data[field] = text(node.data, "original_"+field)
			}
		}
		c.catalog.applyOverride(node.data, node.kind)
		// Apply existing translations first; collect remaining list titles below.
		c.catalog.remember(node)
		c.applyMachineTranslation(req.Context(), node, node.data["translations"] != nil)
		c.catalog.remember(node)
	}
	c.translateListTitles(req.Context(), nodes)
	for _, node := range nodes {
		c.applyMachineTranslation(req.Context(), node, false)
		c.catalog.remember(node)
	}
}

func mergeText(node textNode, fallback map[string]any) {
	for _, field := range node.fields {
		missing := missingText(text(node.data, field))
		if field == "title" || field == "name" {
			missing = titleNeedsFallback(node.data, field)
		}
		alternative := text(fallback, field)
		if missing && !missingText(alternative) {
			node.data[field] = alternative
		}
	}
}

func (c *Client) englishResponse(req *http.Request) map[string]any {
	u := *req.URL
	q := u.Query()
	q.Set("language", "en-US")
	appended := strings.Split(q.Get("append_to_response"), ",")
	q.Del("append_to_response") // skip unrelated providers/cast/translations
	for _, field := range appended {
		if field == "combined_credits" {
			q.Set("append_to_response", field)
		}
	}
	u.RawQuery = q.Encode()
	key := u.String()
	l := &c.localization
	l.mu.Lock()
	entry, ok := l.cache[key]
	l.mu.Unlock()
	if ok && time.Now().Before(entry.expires) {
		return entry.data
	}
	// All fallback work is bounded, including waiting for another request. An
	// unavailable translation must not turn a successful Ukrainian fetch into 500.
	ctx, cancel := context.WithTimeout(req.Context(), 2*time.Second)
	defer cancel()
	result := l.flights.DoChan(key, func() (any, error) {
		l.mu.Lock()
		cached, exists := l.cache[key]
		l.mu.Unlock()
		if exists && time.Now().Before(cached.expires) {
			return cached.data, nil
		}
		fallbackReq := req.Clone(ctx)
		fallbackReq.URL = &u
		var data map[string]any
		err := c.doRaw(fallbackReq, &data)
		ttl := 12 * time.Hour
		if err != nil {
			data = nil
			ttl = time.Minute
		}
		l.mu.Lock()
		if l.cache == nil || len(l.cache) >= 256 {
			l.cache = make(map[string]textCacheEntry)
		}
		l.cache[key] = textCacheEntry{data, time.Now().Add(ttl)}
		l.mu.Unlock()
		return data, nil
	})
	select {
	case <-ctx.Done():
		return nil
	case r := <-result:
		data, _ := r.Val.(map[string]any)
		return data
	}
}
