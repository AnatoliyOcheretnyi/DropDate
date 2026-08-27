import type { ListType, SavedRelease } from "../../../shared/types/releases";
import type {
  GenreFacet,
  SavedSortDirection,
  SavedSortKey,
  SavedTabKey,
} from "../types";

/** A row saved before multi-list support has no `listTypes`; it is a follow. */
export const normalizeItemLists = (item: SavedRelease): ListType[] =>
  item.listTypes && item.listTypes.length > 0 ? item.listTypes : ["follow"];

/**
 * "Nearest release first" and "alphabetical" read as ascending; ratings and
 * recency read as descending. The direction toggle flips whichever is default.
 */
export const defaultDirectionFor = (key: SavedSortKey): SavedSortDirection =>
  key === "release" || key === "alpha" ? "asc" : "desc";

/**
 * Subscriptions are about what is coming next, every other list about what was
 * added last.
 */
export const defaultSortFor = (tab: SavedTabKey): SavedSortKey =>
  tab === "follow" ? "release" : "added";

const timestamp = (value?: string) => {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? undefined : parsed;
};

const sortValue = (
  item: SavedRelease,
  key: SavedSortKey
): number | string | undefined => {
  switch (key) {
    case "userRating":
      return item.userRating || undefined;
    case "tmdbRating":
      return item.tmdbRating || undefined;
    case "release":
      return timestamp(item.nextRelease);
    case "added":
      return timestamp(item.createdAt);
    case "alpha":
      return item.title;
    default:
      return undefined;
  }
};

/**
 * The union tab is a deduplicated view of the whole library: a title in three
 * lists still appears once, which is why its count is `saved.length` and not
 * the sum of the tab counters.
 */
export const selectTabItems = (
  items: SavedRelease[],
  tab: SavedTabKey
): SavedRelease[] =>
  tab === "all"
    ? items
    : items.filter((item) => normalizeItemLists(item).includes(tab));

export const countByList = (
  items: SavedRelease[]
): Record<SavedTabKey, number> => {
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    normalizeItemLists(item).forEach((listType) => {
      acc[listType] = (acc[listType] || 0) + 1;
    });
    return acc;
  }, {});
  return { ...counts, all: items.length } as Record<SavedTabKey, number>;
};

/**
 * Genre counts are scoped to the list being viewed: on "Улюблене" a chip
 * reading "Драма · 5" means five favourite dramas. Genres with no titles in
 * the current list are simply absent.
 */
export const collectGenreFacets = (items: SavedRelease[]): GenreFacet[] => {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    (item.genres ?? []).forEach((genre) => {
      const key = genre.trim();
      if (key) {
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
  });
  return Array.from(counts.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre, "uk"));
};

/**
 * Genres combine with OR, not AND: the library is small and the intersection
 * of two genres usually returns nothing.
 */
export const filterSavedItems = (
  items: SavedRelease[],
  genres: string[],
  query: string
): SavedRelease[] => {
  const needle = query.trim().toLowerCase();
  return items.filter((item) => {
    if (genres.length > 0) {
      const itemGenres = item.genres ?? [];
      if (!genres.some((genre) => itemGenres.includes(genre))) {
        return false;
      }
    }
    if (needle && !item.title.toLowerCase().includes(needle)) {
      return false;
    }
    return true;
  });
};

export const sortSavedItems = (
  items: SavedRelease[],
  key: SavedSortKey,
  direction: SavedSortDirection
): SavedRelease[] => {
  const sorted = [...items];
  const factor = direction === "desc" ? -1 : 1;
  sorted.sort((a, b) => {
    const left = sortValue(a, key);
    const right = sortValue(b, key);
    // Titles without a value stay at the end whichever way the list is sorted:
    // an unrated title is not "the worst", it is simply unrated.
    if (left === undefined && right === undefined) {
      return 0;
    }
    if (left === undefined) {
      return 1;
    }
    if (right === undefined) {
      return -1;
    }
    if (typeof left === "string" || typeof right === "string") {
      return String(left).localeCompare(String(right), "uk") * factor;
    }
    return (left - right) * factor;
  });
  return sorted;
};
