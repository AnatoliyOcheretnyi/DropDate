package themes

import "testing"

// TestCatalogIntegrity guards the properties the pickers rely on: ids are
// unique and never collide with the reserved skip answer, every theme carries
// at least one keyword (a theme without keywords is just a genre filter), and
// every keyword id is a plausible TMDB id.
func TestCatalogIntegrity(t *testing.T) {
	seenID := make(map[string]bool, len(catalog))
	groups := make(map[string]bool, len(groupOrder))
	for _, g := range groupOrder {
		groups[g.id] = true
	}

	for _, theme := range catalog {
		if theme.ID == "" || theme.ID == AnyID {
			t.Fatalf("theme id %q is empty or collides with the skip answer", theme.ID)
		}
		if seenID[theme.ID] {
			t.Fatalf("duplicate theme id %q", theme.ID)
		}
		seenID[theme.ID] = true

		if theme.Label == "" {
			t.Fatalf("theme %q has no label", theme.ID)
		}
		if !groups[theme.Group] {
			t.Fatalf("theme %q has unknown group %q", theme.ID, theme.Group)
		}
		if len(theme.Keywords) == 0 {
			t.Fatalf("theme %q has no keywords", theme.ID)
		}

		seenKeyword := make(map[int]bool, len(theme.Keywords))
		for _, kw := range theme.Keywords {
			if kw <= 0 {
				t.Fatalf("theme %q has invalid keyword id %d", theme.ID, kw)
			}
			if seenKeyword[kw] {
				t.Fatalf("theme %q repeats keyword id %d", theme.ID, kw)
			}
			seenKeyword[kw] = true
		}
	}
}

// TestByID covers the skip answer and unknown ids, which callers use to decide
// whether to apply any thematic filter at all.
func TestByID(t *testing.T) {
	if _, ok := ByID(AnyID); ok {
		t.Fatal("the skip answer must not resolve to a theme")
	}
	if _, ok := ByID(""); ok {
		t.Fatal("an empty id must not resolve to a theme")
	}
	if _, ok := ByID("definitely-not-a-theme"); ok {
		t.Fatal("an unknown id must not resolve to a theme")
	}
	theme, ok := ByID("asylum")
	if !ok || len(theme.Keywords) == 0 {
		t.Fatalf("asylum must resolve with keywords, got %+v ok=%v", theme, ok)
	}
}

// TestPickSkipsUnknown keeps a stale id in a picker's shortlist from producing
// an empty option, and preserves the requested order.
func TestPickSkipsUnknown(t *testing.T) {
	picked := Pick("asylum", "definitely-not-a-theme", "heist")
	if len(picked) != 2 {
		t.Fatalf("expected 2 themes, got %d", len(picked))
	}
	if picked[0].ID != "asylum" || picked[1].ID != "heist" {
		t.Fatalf("Pick must preserve order, got %s, %s", picked[0].ID, picked[1].ID)
	}
}

// TestFullCatalogCoversEveryTheme makes sure no theme is lost between the flat
// list and the grouped view the catalog endpoint serves.
func TestFullCatalogCoversEveryTheme(t *testing.T) {
	full := FullCatalog()
	total := 0
	for _, group := range full.Groups {
		if group.Label == "" {
			t.Fatalf("group %q has no label", group.ID)
		}
		total += len(group.Items)
	}
	if total != len(catalog) {
		t.Fatalf("grouped catalog holds %d themes, flat catalog holds %d", total, len(catalog))
	}
	if full.Meta.Count != len(catalog) {
		t.Fatalf("meta count %d does not match catalog size %d", full.Meta.Count, len(catalog))
	}
}
