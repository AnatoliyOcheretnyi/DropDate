import { useCallback, useMemo, useState } from "react";

import type { ListType } from "../../../shared/types/lists";
import { copy } from "../../../shared/strings";
import { DECADES, matchesDecades, yearOfDate } from "../../../shared/decades";
import type { SavedItem } from "../store/savedStore";
import { useSaved } from "./useSaved";

/** "all" is the deduplicated union of every list, not a list of its own. */
export type SavedTab = ListType | "all";
export type SavedSort = "default" | "rating" | "alpha" | "release";

type Section = {
  id: string;
  title: string;
  items: SavedItem[];
};

export function useSavedScreen() {
  const { saved, removeRelease } = useSaved();
  const [activeList, setActiveList] = useState<SavedTab>("follow");
  const [sort, setSort] = useState<SavedSort>("default");
  const [query, setQuery] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [decades, setDecades] = useState<string[]>([]);

  const tabItems = useMemo(
    () =>
      activeList === "all"
        ? saved
        : saved.filter((item) => item.listTypes?.includes(activeList)),
    [activeList, saved],
  );

  const counts = useMemo(() => {
    const map = saved.reduce<Record<string, number>>((acc, item) => {
      (item.listTypes ?? []).forEach((list) => {
        acc[list] = (acc[list] ?? 0) + 1;
      });
      return acc;
    }, {});
    return { ...map, all: saved.length } as Record<SavedTab, number>;
  }, [saved]);

  /** Facet counts are scoped to the open list, so a chip never promises rows
   *  that the current list cannot show. */
  const genreFacets = useMemo(() => {
    const map = new Map<string, number>();
    tabItems.forEach((item) => {
      (item.genres ?? []).forEach((genre) => {
        const key = genre.trim();
        if (key) map.set(key, (map.get(key) ?? 0) + 1);
      });
    });
    return Array.from(map.entries())
      .map(([genre, count]) => ({ genre, count }))
      .sort(
        (a, b) => b.count - a.count || a.genre.localeCompare(b.genre, "uk"),
      );
  }, [tabItems]);

  const decadeFacets = useMemo(() => {
    const map = new Map<string, number>();
    tabItems.forEach((item) => {
      const year = yearOfDate(item.nextRelease);
      if (year === undefined) return;
      const decade = DECADES.find(
        (entry) =>
          year >= entry.from && (entry.to === undefined || year <= entry.to),
      );
      if (decade) map.set(decade.id, (map.get(decade.id) ?? 0) + 1);
    });
    return DECADES.filter((decade) => map.has(decade.id)).map((decade) => ({
      decade,
      count: map.get(decade.id) ?? 0,
    }));
  }, [tabItems]);

  const toggleGenre = useCallback((genre: string) => {
    setGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((entry) => entry !== genre)
        : [...prev, genre],
    );
  }, []);

  const toggleDecade = useCallback((id: string) => {
    setDecades((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id],
    );
  }, []);

  const resetFilters = useCallback(() => {
    setGenres([]);
    setDecades([]);
    setQuery("");
  }, []);

  const changeList = useCallback((next: SavedTab) => {
    setActiveList(next);
    // Facets are list-scoped, so carrying a chip across lists would leave a
    // filter switched on that no longer matches anything.
    setGenres([]);
    setDecades([]);
  }, []);

  const listItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const items = tabItems.filter((item) => {
      if (genres.length > 0) {
        const own = item.genres ?? [];
        if (!genres.some((genre) => own.includes(genre))) return false;
      }
      if (!matchesDecades(yearOfDate(item.nextRelease), decades)) return false;
      if (needle && !item.title.toLowerCase().includes(needle)) return false;
      return true;
    });
    if (sort === "default") return items;
    return [...items].sort((a, b) =>
      sort === "alpha"
        ? a.title.localeCompare(b.title, "uk")
        : sort === "rating"
          ? (b.userRating ?? 0) - (a.userRating ?? 0)
          : new Date(a.nextRelease || 0).getTime() -
            new Date(b.nextRelease || 0).getTime(),
    );
  }, [decades, genres, query, sort, tabItems]);

  const sections = useMemo<Section[]>(() => {
    const now = new Date();
    const endWeek = new Date();
    endWeek.setDate(endWeek.getDate() + 7);
    const endMonth = new Date();
    endMonth.setDate(endMonth.getDate() + 30);

    const buckets: Record<string, Section> = {
      today: { id: "today", title: copy.saved.sectionTitles.today, items: [] },
      week: { id: "week", title: copy.saved.sectionTitles.week, items: [] },
      month: { id: "month", title: copy.saved.sectionTitles.month, items: [] },
      later: { id: "later", title: copy.saved.sectionTitles.later, items: [] },
      ended: { id: "ended", title: copy.saved.sectionTitles.ended, items: [] },
    };

    listItems.forEach((item) => {
      if (item.status !== "upcoming" || !item.nextRelease) {
        buckets.ended.items.push(item);
        return;
      }
      const date = new Date(item.nextRelease);
      if (Number.isNaN(date.getTime())) {
        buckets.later.items.push(item);
        return;
      }
      if (date.toDateString() === now.toDateString()) {
        buckets.today.items.push(item);
        return;
      }
      if (date <= endWeek) {
        buckets.week.items.push(item);
        return;
      }
      if (date <= endMonth) {
        buckets.month.items.push(item);
        return;
      }
      buckets.later.items.push(item);
    });

    return Object.values(buckets).filter((section) => section.items.length > 0);
  }, [listItems]);

  const stats = useMemo(() => {
    const total = listItems.length;
    const seriesCount = listItems.filter(
      (item) => item.mediaType === "tv",
    ).length;

    if (activeList === "all" || activeList === "follow") {
      const now = new Date();
      const endWeek = new Date();
      endWeek.setDate(endWeek.getDate() + 7);
      const thisWeek = listItems.filter((item) => {
        if (!item.nextRelease) return false;
        const date = new Date(item.nextRelease);
        return date >= now && date <= endWeek;
      }).length;
      return {
        left: { value: total, label: copy.listStats.total },
        middle: {
          value: thisWeek,
          label: copy.listStats.thisWeek,
          tone: "warm" as const,
        },
        right: {
          value: seriesCount,
          label: copy.listStats.series,
          tone: "cool" as const,
        },
      };
    }

    if (activeList === "watchlist") {
      const watchedCount = listItems.reduce(
        (acc, item) => acc + (item.watchCount ?? 0),
        0,
      );
      return {
        left: { value: total, label: copy.listStats.total },
        middle: {
          value: watchedCount,
          label: copy.listStats.watched,
          tone: "warm" as const,
        },
        right: {
          value: seriesCount,
          label: copy.listStats.series,
          tone: "cool" as const,
        },
      };
    }

    if (activeList === "favorite") {
      const rewatches = listItems.reduce((acc, item) => {
        const count = item.watchCount ?? 0;
        return acc + Math.max(count - 1, 0);
      }, 0);
      return {
        left: { value: total, label: copy.listStats.total },
        middle: {
          value: rewatches,
          label: copy.listStats.rewatches,
          tone: "warm" as const,
        },
        right: {
          value: seriesCount,
          label: copy.listStats.series,
          tone: "cool" as const,
        },
      };
    }

    if (activeList === "watched") {
      const views = listItems.reduce(
        (acc, item) => acc + (item.watchCount ?? 0),
        0,
      );
      return {
        left: { value: total, label: copy.listStats.total },
        middle: {
          value: views,
          label: copy.listStats.views,
          tone: "warm" as const,
        },
        right: {
          value: seriesCount,
          label: copy.listStats.series,
          tone: "cool" as const,
        },
      };
    }

    const ratings = listItems
      .map((item) => item.userRating)
      .filter((value): value is number => typeof value === "number");
    const avg =
      ratings.length > 0
        ? Math.round(
            (ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10,
          ) / 10
        : 0;
    return {
      left: { value: total, label: copy.listStats.total },
      middle: {
        value: `${avg}`,
        label: copy.listStats.avgRating,
        tone: "warm" as const,
      },
      right: {
        value: seriesCount,
        label: copy.listStats.series,
        tone: "cool" as const,
      },
    };
  }, [activeList, listItems]);

  const isFiltered =
    genres.length > 0 || decades.length > 0 || query.trim().length > 0;

  return {
    activeList,
    setActiveList: changeList,
    counts,
    sort,
    setSort,
    query,
    setQuery,
    genres,
    genreFacets,
    toggleGenre,
    decades,
    decadeFacets,
    toggleDecade,
    resetFilters,
    isFiltered,
    tabItems,
    listItems,
    sections,
    stats,
    removeRelease,
  };
}
