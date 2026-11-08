package airecs

import "testing"

func TestValidateRejectsInventedTitlesWrongMediaAndDuplicates(t *testing.T) {
	pool := []Candidate{{TMDBID: 12, MediaType: "movie"}, {TMDBID: 34, MediaType: "tv"}}
	response := []Selection{
		{TMDBID: 999, MediaType: "movie"},
		{TMDBID: 12, MediaType: "tv"},
		{TMDBID: 34, MediaType: "TV", Reason: "  Твій жанр  "},
		{TMDBID: 34, MediaType: "tv"},
		{TMDBID: 12, MediaType: "movie"},
	}
	got := validate(response, pool, 4)
	if len(got) != 2 || got[0].TMDBID != 34 || got[1].TMDBID != 12 {
		t.Fatalf("unsafe or reordered model output: %+v", got)
	}
	if got[0].MediaType != "tv" || got[0].Reason != "Твій жанр" {
		t.Fatalf("noncanonical selection: %+v", got[0])
	}
	if len(validate(response, pool, 1)) != 1 || len(validate(response, pool, 0)) != 0 {
		t.Fatal("selection limit ignored")
	}
}
