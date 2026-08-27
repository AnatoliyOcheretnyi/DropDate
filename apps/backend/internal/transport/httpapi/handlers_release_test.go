package httpapi

import (
	"testing"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
)

func TestRankPersonCreditsDropsTalkShowsAndLeadsWithTheirOwnWork(t *testing.T) {
	credits := []release.PersonCredit{
		{TMDBID: 1, MediaType: "tv", Title: "Нічне шоу", Role: "actor", Character: "Self - Guest", Popularity: 225},
		{TMDBID: 2, MediaType: "tv", Title: "The Talk", Role: "actor", Popularity: 200},
		{TMDBID: 3, MediaType: "movie", Title: "Інтерстеллар", Role: "actor", Character: "Man", Popularity: 90},
		{TMDBID: 4, MediaType: "movie", Title: "Одіссея", Role: "director", Job: "Director", Popularity: 60},
		{TMDBID: 4, MediaType: "movie", Title: "Одіссея", Role: "writer", Job: "Writer", Popularity: 60},
		{TMDBID: 5, MediaType: "movie", Title: "Темний лицар", Role: "director", Job: "Director", Popularity: 57},
	}

	titles := rankPersonCredits(credits, "Directing")

	got := make([]string, 0, len(titles))
	for _, title := range titles {
		got = append(got, title.Title)
	}
	want := []string{"Одіссея", "Темний лицар", "Інтерстеллар"}
	if len(got) != len(want) {
		t.Fatalf("titles = %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("titles = %v, want %v", got, want)
		}
	}
}

func TestRankPersonCreditsKeepsSeriesRolesForActors(t *testing.T) {
	credits := []release.PersonCredit{
		{TMDBID: 1, MediaType: "tv", Title: "Ейфорія", Role: "actor", Character: "Rue", Popularity: 40},
		{TMDBID: 2, MediaType: "tv", Title: "Шоу Ґрема Нортона", Role: "actor", Popularity: 90},
		{TMDBID: 3, MediaType: "movie", Title: "Дюна", Role: "actor", Character: "Chani", Popularity: 80},
	}

	titles := rankPersonCredits(credits, "Acting")

	if len(titles) != 2 {
		t.Fatalf("expected the talk show to be dropped, got %v", titles)
	}
	if titles[0].Title != "Дюна" || titles[1].Title != "Ейфорія" {
		t.Fatalf("unexpected order: %v", titles)
	}
}

func TestRoleForDepartment(t *testing.T) {
	cases := map[string]string{
		"Directing":  "director",
		"acting":     "actor",
		"Writing":    "writer",
		"Production": "",
		"":           "",
	}
	for department, want := range cases {
		if got := roleForDepartment(department); got != want {
			t.Fatalf("roleForDepartment(%q) = %q, want %q", department, got, want)
		}
	}
}
