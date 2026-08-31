"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ListType, SavedRelease } from "../../../shared/types/releases";
import type {
  SavedSortDirection,
  SavedSortKey,
  SavedTabKey,
  SavedViewMode,
} from "../types";
import {
  collectGenreFacets,
  countByList,
  defaultDirectionFor,
  defaultSortFor,
  filterSavedItems,
  selectTabItems,
  sortSavedItems,
} from "../utils/savedFilters";

const LIST_TYPES: ListType[] = [
  "follow",
  "watchlist",
  "favorite",
  "liked",
  "watched",
  "disliked",
];

const SORT_KEYS: SavedSortKey[] = [
  "userRating",
  "tmdbRating",
  "release",
  "added",
  "alpha",
];

const parseTab = (value: string | null): SavedTabKey => {
  if (value === "all") {
    return "all";
  }
  return LIST_TYPES.includes(value as ListType) ? (value as ListType) : "all";
};

const parseSort = (value: string | null): SavedSortKey | null =>
  SORT_KEYS.includes(value as SavedSortKey) ? (value as SavedSortKey) : null;

const parseGenres = (value: string | null): string[] =>
  value
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

type Options = {
  /** Where the filter state is mirrored: /saved for my library, the friend
   *  route for someone else's. */
  basePath?: string;
};

export function useSavedFilters(saved: SavedRelease[], options: Options = {}) {
  const basePath = options.basePath ?? "/saved";
  const router = useRouter();
  const searchParams = useSearchParams();

  // The URL seeds the filters once and is then written from state: keeping the
  // search box bound to the URL would re-route on every keystroke.
  const [tab, setTabState] = useState<SavedTabKey>(() =>
    parseTab(searchParams.get("list"))
  );
  const [genres, setGenres] = useState<string[]>(() =>
    parseGenres(searchParams.get("genre"))
  );
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [sortKey, setSortKeyState] = useState<SavedSortKey>(
    () => parseSort(searchParams.get("sort")) ?? defaultSortFor(parseTab(searchParams.get("list")))
  );
  const [direction, setDirection] = useState<SavedSortDirection>(() =>
    searchParams.get("dir") === "asc" || searchParams.get("dir") === "desc"
      ? (searchParams.get("dir") as SavedSortDirection)
      : defaultDirectionFor(
          parseSort(searchParams.get("sort")) ??
            defaultSortFor(parseTab(searchParams.get("list")))
        )
  );
  const [view, setView] = useState<SavedViewMode>(() =>
    searchParams.get("view") === "compact" ? "compact" : "grid"
  );
  // Sort follows the tab only while the user has not chosen one themselves.
  const [sortPinned, setSortPinned] = useState(
    () => parseSort(searchParams.get("sort")) !== null
  );

  const setTab = useCallback(
    (next: SavedTabKey) => {
      setTabState(next);
      setGenres([]);
      if (!sortPinned) {
        const nextSort = defaultSortFor(next);
        setSortKeyState(nextSort);
        setDirection(defaultDirectionFor(nextSort));
      }
    },
    [sortPinned]
  );

  const setSortKey = useCallback((next: SavedSortKey) => {
    setSortKeyState(next);
    setDirection(defaultDirectionFor(next));
    setSortPinned(true);
  }, []);

  const toggleDirection = useCallback(() => {
    setDirection((prev) => (prev === "desc" ? "asc" : "desc"));
    setSortPinned(true);
  }, []);

  const toggleGenre = useCallback((genre: string) => {
    setGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((entry) => entry !== genre)
        : [...prev, genre]
    );
  }, []);

  const resetFilters = useCallback(() => {
    setGenres([]);
    setQuery("");
    const nextSort = defaultSortFor(tab);
    setSortKeyState(nextSort);
    setDirection(defaultDirectionFor(nextSort));
    setSortPinned(false);
  }, [tab]);

  // A filtered list is worth sharing, so the state lives in the URL.
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== "all") {
      params.set("list", tab);
    }
    if (genres.length > 0) {
      params.set("genre", genres.join(","));
    }
    if (query.trim()) {
      params.set("q", query.trim());
    }
    if (sortPinned) {
      params.set("sort", sortKey);
      params.set("dir", direction);
    }
    if (view !== "grid") {
      params.set("view", view);
    }
    const search = params.toString();
    router.replace(search ? `${basePath}?${search}` : basePath, { scroll: false });
  }, [basePath, direction, genres, query, router, sortKey, sortPinned, tab, view]);

  const tabCounts = useMemo(() => countByList(saved), [saved]);

  const tabItems = useMemo(() => selectTabItems(saved, tab), [saved, tab]);

  const genreFacets = useMemo(() => collectGenreFacets(tabItems), [tabItems]);

  const filteredItems = useMemo(
    () => filterSavedItems(tabItems, genres, query),
    [genres, query, tabItems]
  );

  const displayItems = useMemo(
    () => sortSavedItems(filteredItems, sortKey, direction),
    [direction, filteredItems, sortKey]
  );

  const hasActiveFilters =
    genres.length > 0 || query.trim().length > 0 || sortPinned;

  return {
    direction,
    displayItems,
    filteredItems,
    genreFacets,
    genres,
    hasActiveFilters,
    isSortPinned: sortPinned,
    query,
    resetFilters,
    setQuery,
    setSortKey,
    setTab,
    setView,
    sortKey,
    tab,
    tabCounts,
    tabItems,
    toggleDirection,
    toggleGenre,
    view,
  };
}
