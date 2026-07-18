package taste

import (
	"math"
	"testing"
)

func TestEloScoresWinnerGainsAndPreservesTotal(t *testing.T) {
	left, right := eloScores(1000, 1000, "left")
	if left <= 1000 || right >= 1000 {
		t.Fatalf("winner should gain and loser should lose: %.2f %.2f", left, right)
	}
	if math.Abs(left+right-2000) > 0.001 {
		t.Fatalf("score total changed: %.2f", left+right)
	}
}

func TestEloScoresTiePullsScoresTogether(t *testing.T) {
	left, right := eloScores(1200, 900, "tie")
	if left >= 1200 || right <= 900 {
		t.Fatalf("tie should pull ratings together: %.2f %.2f", left, right)
	}
}

func TestCatalogReturnsCopy(t *testing.T) {
	first, ok := Catalog("genre")
	if !ok || len(first) == 0 {
		t.Fatal("genre catalog missing")
	}
	first[0] = "changed"
	second, _ := Catalog("genre")
	if second[0] == "changed" {
		t.Fatal("catalog leaked mutable storage")
	}
}
