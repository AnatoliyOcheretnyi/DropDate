"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Suggestion } from "../../../shared/lib/release";
import { copy } from "../../../shared/lib/strings";
import { useSuggestions } from "../../../shared/hooks/useSuggestions";
import { useSavedReleases } from "./useSavedReleases";

export function useSavedPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<Suggestion | null>(null);
  const [, setIsInputFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const {
    saved,
    savedCount,
    isReady: isStorageReady,
    removeRelease,
    isSuggestionSaved,
    setSuggestionLists,
    updateListStats,
    refreshAll,
    isRefreshing,
  } = useSavedReleases();

  const handleClearSelection = useCallback(() => {
    setSelectedSuggestion(null);
  }, []);

  const { suggestions, isFetching: isFetchingSuggestions } = useSuggestions(
    title,
    selectedSuggestion,
    handleClearSelection
  );

  const handleSearchToggle = () => {
    setIsSearchOpen((prev) => !prev);
  };

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false);
    setIsInputFocused(false);
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    setSelectedSuggestion(null);
    setIsInputFocused(false);
    setIsSearchOpen(false);
    router.push(`/search?query=${encodeURIComponent(trimmed)}`);
  };

  const handleSuggestionSelect = useCallback(
    (suggestion: Suggestion) => {
      setSelectedSuggestion(suggestion);
      setTitle(suggestion.title);
      setIsInputFocused(false);
      setIsSearchOpen(false);
      router.push(`/title/${suggestion.mediaType}/${suggestion.id}`);
    },
    [router]
  );

  const handleRefreshAllClick = async () => {
    setRefreshMessage(null);
    try {
      const result = await refreshAll();
      if (!result || result.results.length === 0) {
        setRefreshMessage(copy.hints.noRefresh);
        return;
      }
      const failed = result.results.filter((item) => item.error);
      if (failed.length > 0) {
        setRefreshMessage(copy.hints.partialUpdate(failed.length));
      } else {
        setRefreshMessage(copy.hints.listUpdated);
      }
    } catch (err) {
      setRefreshMessage(
        err instanceof Error ? err.message : copy.errors.refreshFailed
      );
    }
  };

  return {
    blurTimeoutRef,
    handleRefreshAllClick,
    handleSearchClose,
    handleSearchToggle,
    handleSubmit,
    handleSuggestionSelect,
    isFetchingSuggestions,
    isRefreshing,
    isSearchOpen,
    isStorageReady,
    isSuggestionSaved,
    refreshMessage,
    removeRelease,
    saved,
    savedCount,
    setSuggestionLists,
    setTitle,
    suggestions,
    title,
    updateListStats,
  };
}
