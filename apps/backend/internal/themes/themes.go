// Package themes is the thematic layer that sits above genres: curated sets of
// TMDB keyword ids ("про хворобу", "психлікарня", "молодіжна комедія") that a
// picker folds into a /discover query.
//
// Genres answer "what kind of film"; themes answer "what it is about". Every
// keyword id here was resolved against TMDB /search/keyword by exact name, so
// the catalog is data, not guesswork -- see catalog.go for the names behind the
// ids. Keyword ids are stable, which is why they are baked in rather than
// looked up at runtime.
package themes

import "sort"

// Theme is one thematic lens.
//
// Keywords are OR-joined by the caller (any of them matches). WithGenres and
// WithoutGenres are optional MOVIE genre ids that sharpen a theme whose
// keywords alone are ambiguous -- "про хворобу" without the drama genre and
// without horror/sci-fi drifts into zombie outbreaks. Callers running a /tv
// query must skip the genre hints, because TV genre ids differ from movie ones.
type Theme struct {
	ID            string `json:"id"`
	Label         string `json:"label"`
	Emoji         string `json:"emoji,omitempty"`
	Group         string `json:"group"`
	Keywords      []int  `json:"keywords"`
	WithGenres    []int  `json:"withGenres,omitempty"`
	WithoutGenres []int  `json:"withoutGenres,omitempty"`
}

// Group is a display bucket of themes, used by the catalog endpoint.
type Group struct {
	ID    string  `json:"id"`
	Label string  `json:"label"`
	Items []Theme `json:"items"`
}

// Catalog is the full grouped catalog, ordered for display.
type Catalog struct {
	Groups []Group `json:"groups"`
	Meta   struct {
		Count   int `json:"count"`
		Version int `json:"version"`
	} `json:"meta"`
}

// AnyID is the reserved answer meaning "no thematic filter". It is never a
// catalog entry, so ByID("any") reports not-found and callers apply nothing.
const AnyID = "any"

// Version lets clients cache-bust when the catalog changes.
const Version = 1

var byID = func() map[string]Theme {
	out := make(map[string]Theme, len(catalog))
	for _, theme := range catalog {
		out[theme.ID] = theme
	}
	return out
}()

// ByID returns a theme by id. The reserved AnyID and unknown ids report false.
func ByID(id string) (Theme, bool) {
	if id == "" || id == AnyID {
		return Theme{}, false
	}
	theme, ok := byID[id]
	return theme, ok
}

// All returns every theme in catalog order.
func All() []Theme {
	out := make([]Theme, len(catalog))
	copy(out, catalog)
	return out
}

// Pick returns the themes for the given ids, in the order requested, skipping
// unknown ids. It is the lookup the pickers use to build option lists.
func Pick(ids ...string) []Theme {
	out := make([]Theme, 0, len(ids))
	for _, id := range ids {
		if theme, ok := ByID(id); ok {
			out = append(out, theme)
		}
	}
	return out
}

// FullCatalog returns the catalog grouped for display. Groups keep their
// declared order; unknown groups (should never happen) sort last by id.
func FullCatalog() Catalog {
	index := make(map[string][]Theme, len(groupOrder))
	for _, theme := range catalog {
		index[theme.Group] = append(index[theme.Group], theme)
	}

	var out Catalog
	out.Groups = make([]Group, 0, len(index))
	seen := make(map[string]bool, len(groupOrder))
	for _, g := range groupOrder {
		items := index[g.id]
		if len(items) == 0 {
			continue
		}
		seen[g.id] = true
		out.Groups = append(out.Groups, Group{ID: g.id, Label: g.label, Items: items})
	}

	extra := make([]string, 0)
	for id := range index {
		if !seen[id] {
			extra = append(extra, id)
		}
	}
	sort.Strings(extra)
	for _, id := range extra {
		out.Groups = append(out.Groups, Group{ID: id, Label: id, Items: index[id]})
	}

	out.Meta.Count = len(catalog)
	out.Meta.Version = Version
	return out
}
