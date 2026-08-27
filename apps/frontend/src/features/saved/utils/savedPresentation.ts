import type { Suggestion } from "../../../shared/lib/release";
import type { SavedRelease } from "../../../shared/types/releases";

export const savedMediaType = (item: SavedRelease): Suggestion["mediaType"] =>
  item.mediaType || (item.type === "movie" ? "movie" : "tv");

/** Short release date for the poster chip; empty when the title has no date. */
export const formatSavedDate = (value?: string) => {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "short",
  }).format(parsed);
};

/**
 * Type and genres in one line — `ФІЛЬМ · ФАНТАСТИКА · ДРАМА`. Two genres is the
 * most a ~210px column holds; titles saved before the genres backfill fall back
 * to the bare type, which is what the card showed before.
 */
export const savedMetaLine = (item: SavedRelease, genreLimit = 2) => {
  const type = savedMediaType(item) === "movie" ? "Фільм" : "Серіал";
  const genres = (item.genres ?? []).slice(0, genreLimit);
  return [type, ...genres].join(" · ");
};
