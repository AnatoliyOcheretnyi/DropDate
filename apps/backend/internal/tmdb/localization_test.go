package tmdb

import "testing"

func TestLooksRussian(t *testing.T) {
	cases := map[string]bool{
		"Елена Метёлкина":   true,  // ё
		"Метод Лавровой":    false, // indistinguishable by alphabet alone
		"Крістофер Нолан":   false,
		"Christopher Nolan": false,
		"Быть или не быть":  true, // ы
	}
	for value, want := range cases {
		if got := looksRussian(value); got != want {
			t.Fatalf("looksRussian(%q) = %v, want %v", value, got, want)
		}
	}
}

func TestUntranslatedDetectsEchoedRussianOriginals(t *testing.T) {
	// TMDB has no Ukrainian title, so it echoed the Russian original back.
	if !untranslated("Метод", "Метод", "ru") {
		t.Fatal("expected an echoed Russian original to count as untranslated")
	}
	// A real Ukrainian translation differs from the original.
	if untranslated("Гостя з майбутнього", "Гостья из будущего", "ru") {
		t.Fatal("a translated title must not be treated as untranslated")
	}
	// English originals are left alone: they are not the problem being solved.
	if untranslated("The Batman", "The Batman", "en") {
		t.Fatal("English originals must not trigger the fallback")
	}
}

func TestPreferLatinKeepsUsableValuesOnly(t *testing.T) {
	if got := preferLatin("Метод", "The Method"); got != "The Method" {
		t.Fatalf("preferLatin = %q, want the English title", got)
	}
	if got := preferLatin("Метод", ""); got != "Метод" {
		t.Fatalf("preferLatin = %q, want the original when there is no fallback", got)
	}
	// A fallback that is itself Russian is no improvement.
	if got := preferLatin("Метёлкина", "Метёлкина"); got != "Метёлкина" {
		t.Fatalf("preferLatin = %q, want the original", got)
	}
}
