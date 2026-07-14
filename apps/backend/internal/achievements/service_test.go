package achievements

import "testing"

func TestNextTier(t *testing.T) {
	cases := []struct {
		name     string
		unlocked []int
		want     int
	}{
		{"nothing unlocked yet", nil, 1},
		{"first tier unlocked", []int{1}, 10},
		{"mid ladder", []int{1, 10, 50}, 100},
		{"fully unlocked", []int{1, 10, 50, 100, 200, 500, 1000}, 0},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := nextTier(tc.unlocked); got != tc.want {
				t.Fatalf("nextTier(%v) = %d, want %d", tc.unlocked, got, tc.want)
			}
		})
	}
}

func TestIsStatusListType(t *testing.T) {
	statusLists := []string{"favorite", "liked", "watched", "disliked"}
	for _, listType := range statusLists {
		if !isStatusListType(listType) {
			t.Errorf("expected %q to be a status list", listType)
		}
	}
	nonStatusLists := []string{"follow", "watchlist", "total", ""}
	for _, listType := range nonStatusLists {
		if isStatusListType(listType) {
			t.Errorf("expected %q to not be a status list", listType)
		}
	}
}

func TestToSet(t *testing.T) {
	set := toSet([]int{1, 10, 50})
	for _, tier := range []int{1, 10, 50} {
		if !set[tier] {
			t.Errorf("expected tier %d in set", tier)
		}
	}
	if set[100] {
		t.Error("expected tier 100 to be absent")
	}
}
