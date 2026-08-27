import type { ListType } from "../../shared/types/releases";

/**
 * `all` is not a list: it is the deduplicated union of every list, and the
 * default tab. A title in three lists still appears once.
 */
export type SavedTabKey = ListType | "all";

export type SavedSortKey =
  | "userRating"
  | "tmdbRating"
  | "release"
  | "added"
  | "alpha";

export type SavedSortDirection = "desc" | "asc";

export type SavedViewMode = "grid" | "compact";

export type SavedTab = {
  key: SavedTabKey;
  label: string;
  count: number;
};

export type GenreFacet = {
  genre: string;
  count: number;
};

export const SAVED_SORT_LABELS: Record<SavedSortKey, string> = {
  userRating: "Моя оцінка",
  tmdbRating: "Оцінка TMDB",
  release: "Дата релізу",
  added: "Нещодавно додані",
  alpha: "За назвою",
};

/** Genre chips shown inline; the rest live behind the "Ще N" dropdown. */
export const VISIBLE_GENRE_COUNT = 8;
