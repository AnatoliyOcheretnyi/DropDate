"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Suggestion } from "../../../../lib/release";
import { copy } from "../../../../lib/strings";
import { useSavedReleases } from "../../../../app/hooks/useSavedReleases";
import { useSuggestions } from "../../../../app/hooks/useSuggestions";
import type { SearchFilter, SearchPayload } from "../types";

export function useSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [filter, setFilter] = useState<SearchFilter>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<Suggestion | null>(null);
  const [, setIsInputFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { saved, isSuggestionSaved, getListTypes } = useSavedReleases();

  const handleClearSelection = useCallback(() => {
    setSelectedSuggestion(null);
    setError(null);
  }, []);

  const { suggestions, isFetching: isFetchingSuggestions } = useSuggestions(
    title,
    selectedSuggestion,
    handleClearSelection
  );

  const currentQuery = (searchParams.get("query") || "").trim();

  const loadResults = useCallback(
    async (query: string, pageToLoad: number, append: boolean) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setResults([]);
        setPage(1);
        setTotalPages(1);
        setTotalResults(0);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/search?query=${encodeURIComponent(trimmed)}&page=${pageToLoad}`,
          { cache: "no-store" }
        );
        const payload = (await response.json()) as SearchPayload;
        if (!response.ok) {
          setResults([]);
          setPage(1);
          setTotalPages(1);
          setTotalResults(0);
          setError(copy.errors.searchFailed);
          return;
        }

        setResults((prev) =>
          append ? [...prev, ...payload.results] : payload.results
        );
        setPage(payload.page || pageToLoad);
        setTotalPages(payload.totalPages || 1);
        setTotalResults(payload.totalResults || 0);
      } catch {
        setResults([]);
        setPage(1);
        setTotalPages(1);
        setTotalResults(0);
        setError(copy.errors.searchFailed);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    setTitle(currentQuery);
    setFilter("all");
    handleClearSelection();
    if (!currentQuery) {
      setResults([]);
      return;
    }
    loadResults(currentQuery, 1, false);
  }, [currentQuery, handleClearSelection, loadResults]);

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

  const handleNav = (view: "home" | "saved") => {
    if (view === "saved") {
      router.push("/saved");
      return;
    }
    router.push("/");
  };

  const handleLoadMore = () => {
    if (isLoading || page >= totalPages) {
      return;
    }
    loadResults(currentQuery, page + 1, true);
  };

  return {
    blurTimeoutRef,
    currentQuery,
    error,
    filter,
    filteredResults,
    getListTypes,
    handleLoadMore,
    handleNav,
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
