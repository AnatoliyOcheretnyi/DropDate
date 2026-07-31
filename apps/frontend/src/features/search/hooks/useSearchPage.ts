"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReleaseInfo, Suggestion } from "../../../shared/lib/release";
import type { ListType } from "../../../shared/types/releases";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { copy } from "../../../shared/lib/strings";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { useSuggestions } from "../../../shared/hooks/useSuggestions";
import type { SearchFilter } from "../types";
import { fetchSearchResults } from "../api/searchApi";

export function useSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState<SearchFilter>("all");
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<Suggestion | null>(null);
  const [, setIsInputFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { saved, isSuggestionSaved, getListTypes, setSuggestionLists } =
    useSavedReleases();

  const handleClearSelection = useCallback(() => {
    setSelectedSuggestion(null);
  }, []);

  const { suggestions, isFetching: isFetchingSuggestions } = useSuggestions(
    title,
    selectedSuggestion,
    handleClearSelection
  );

  const currentQuery = (searchParams.get("query") || "").trim();

  const searchQuery = useInfiniteQuery({
    queryKey: webQueryKeys.search(currentQuery),
    enabled: Boolean(currentQuery),
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      const { ok, payload } = await fetchSearchResults(
        currentQuery,
        pageParam,
        signal
      );
      if (!ok || !payload) {
        throw new Error(copy.errors.searchFailed);
      }
      return payload;
    },
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });

  useEffect(() => {
    setTitle(currentQuery);
    setFilter("all");
    handleClearSelection();
  }, [currentQuery, handleClearSelection]);

  const results = useMemo(
    () => searchQuery.data?.pages.flatMap((payload) => payload.results) ?? [],
    [searchQuery.data]
  );

  const pages = searchQuery.data?.pages ?? [];
  const totalPages = pages[0]?.totalPages ?? 1;
  const totalResults = pages[0]?.totalResults ?? 0;
  const page = pages[pages.length - 1]?.page ?? 1;
  const error = searchQuery.isError ? copy.errors.searchFailed : null;
  const isLoading = searchQuery.isLoading || searchQuery.isFetchingNextPage;

  const filteredResults = useMemo(() => {
    if (filter === "all") {
      return results;
    }
    return results.filter((item) => item.mediaType === filter);
  }, [filter, results]);

  const handleSelect = useCallback(
    async (suggestion: Suggestion) => {
      setSelectedSuggestion(suggestion);
      setIsInputFocused(false);
      setIsSearchOpen(false);
      setTitle(suggestion.title);
      router.push(`/title/${suggestion.mediaType}/${suggestion.id}`);
    },
    [router]
  );

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    setIsSearchOpen(false);
    setIsInputFocused(false);
    router.push(`/search?query=${encodeURIComponent(trimmed)}`);
  };

  const handleSuggestionSelect = useCallback(
    (suggestion: Suggestion) => {
      setIsSearchOpen(false);
      setIsInputFocused(false);
      router.push(`/title/${suggestion.mediaType}/${suggestion.id}`);
    },
    [router]
  );

  const handleSearchToggle = () => {
    setIsSearchOpen((prev) => !prev);
  };

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false);
    setIsInputFocused(false);
  }, []);

  const handleNav = (view: string) => {
    if (view === "saved") {
      router.push("/saved");
      return;
    }
    router.push("/");
  };

  const handleLoadMore = () => {
    if (isLoading || !searchQuery.hasNextPage) {
      return;
    }
    void searchQuery.fetchNextPage();
  };

  const handleResultListChange = useCallback(
    (suggestion: Suggestion, next: ListType[]) => {
      const fallback: ReleaseInfo = {
        title: suggestion.title,
        type: suggestion.mediaType === "movie" ? "movie" : "series",
        nextRelease: "",
        source: "tmdb",
        posterUrl: suggestion.posterUrl,
        status: "released",
      };
      setSuggestionLists(suggestion, next, fallback);
    },
    [setSuggestionLists]
  );

  return {
    allResults: results,
    blurTimeoutRef,
    currentQuery,
    error,
    filter,
    filteredResults,
    getListTypes,
    handleLoadMore,
    handleNav,
    handleResultListChange,
    handleSearchClose,
    handleSearchSubmit,
    handleSearchToggle,
    handleSelect,
    handleSuggestionSelect,
    isFetchingSuggestions,
    isLoading,
    isSearchOpen,
    isSuggestionSaved,
    page,
    savedCount: saved.length,
    setFilter,
    setTitle,
    suggestions,
    title,
    totalPages,
    totalResults,
  };
}
