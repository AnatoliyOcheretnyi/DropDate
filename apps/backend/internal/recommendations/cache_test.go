package recommendations

import (
	"testing"
	"time"
)

func TestAICacheDebounceInvalidation(t *testing.T) {
	svc := NewService(nil, nil, nil, nil)

	clock := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	svc.now = func() time.Time { return clock }
	svc.SetRefreshDebounce(5 * time.Minute)

	const user = "user-1"
	const limit = 12

	stored := Result{Meta: Meta{SeedCount: 7}}
	svc.StoreAI(user, limit, stored)

	// Fresh store -> hit.
	if got, ok := svc.CachedAI(user, limit); !ok || got.Meta.SeedCount != 7 {
		t.Fatalf("expected cache hit with seedCount 7, got ok=%v result=%+v", ok, got)
	}

	// A saved-list change starts the debounce window but keeps serving the
	// cached feed for now.
	svc.MarkDirty(user)
	clock = clock.Add(2 * time.Minute) // still inside the 5m window
	if _, ok := svc.CachedAI(user, limit); !ok {
		t.Fatal("expected cache hit inside debounce window")
	}

	// Once the window elapses, the next lookup misses (caches purged) so the
	// feed regenerates exactly once.
	clock = clock.Add(4 * time.Minute) // now 6m past the change -> elapsed
	if _, ok := svc.CachedAI(user, limit); ok {
		t.Fatal("expected cache miss after debounce window elapsed")
	}
}

func TestMarkDirtyPurgesBothVariants(t *testing.T) {
	svc := NewService(nil, nil, nil, nil)
	clock := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	svc.now = func() time.Time { return clock }
	svc.SetRefreshDebounce(0) // no debounce -> immediate invalidation

	const user = "user-2"
	const limit = 12

	svc.saveCache(user, limit, "", Result{Meta: Meta{SeedCount: 1}})
	svc.StoreAI(user, limit, Result{Meta: Meta{SeedCount: 2}})

	svc.MarkDirty(user)

	if _, ok := svc.lookupCache(user, limit, ""); ok {
		t.Error("expected deterministic variant purged")
	}
	if _, ok := svc.CachedAI(user, limit); ok {
		t.Error("expected AI variant purged")
	}
}

func TestMarkDirtyDoesNotExtendWindow(t *testing.T) {
	svc := NewService(nil, nil, nil, nil)
	clock := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	svc.now = func() time.Time { return clock }
	svc.SetRefreshDebounce(5 * time.Minute)

	const user = "user-3"
	const limit = 12
	svc.StoreAI(user, limit, Result{Meta: Meta{SeedCount: 3}})

	svc.MarkDirty(user)                // deadline = 12:05
	clock = clock.Add(3 * time.Minute) // 12:03
	svc.MarkDirty(user)                // must NOT push the deadline to 12:08
	clock = clock.Add(3 * time.Minute) // 12:06 -> past original deadline

	if _, ok := svc.CachedAI(user, limit); ok {
		t.Fatal("expected miss: first change must bound staleness, later changes must not extend it")
	}
}
