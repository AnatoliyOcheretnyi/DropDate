package tmdb

import "strings"

// Ukrainian coverage on TMDB is patchy. When a title has no Ukrainian
// translation the API hands back the original, and for Russian-language works
// that puts Russian text in a Ukrainian interface — the app's own language is
// Ukrainian, so English is the better fallback. Person names have the same
// problem: TMDB stores some of them under a Russian spelling as the "uk"
// value.
//
// These helpers decide when the Ukrainian record is not really Ukrainian; the
// callers then re-fetch the same resource in en-US and substitute.

// russianOnlyLetters exist in Russian and not in Ukrainian, so a string
// containing one of them is not Ukrainian text.
const russianOnlyLetters = "ёыэъЁЫЭЪ"

func looksRussian(value string) bool {
	return strings.ContainsAny(value, russianOnlyLetters)
}

// untranslated reports that the "Ukrainian" value is just the original title of
// a Russian-language work echoed back.
func untranslated(localized, original, originalLanguage string) bool {
	switch strings.ToLower(strings.TrimSpace(originalLanguage)) {
	case "ru", "be":
		return strings.TrimSpace(localized) == strings.TrimSpace(original)
	default:
		return false
	}
}

// needsLatinFallback reports whether the English record should be preferred
// over what the Ukrainian request returned.
func needsLatinFallback(localized, original, originalLanguage string) bool {
	return looksRussian(localized) || untranslated(localized, original, originalLanguage)
}

// preferLatin returns the English value when it adds something; an empty or
// equally Russian fallback leaves the original value untouched.
func preferLatin(localized, fallback string) string {
	fallback = strings.TrimSpace(fallback)
	if fallback == "" || looksRussian(fallback) {
		return localized
	}
	return fallback
}
