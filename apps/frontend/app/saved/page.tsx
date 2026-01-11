"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Suggestion } from "../../lib/release";
import { Header } from "../components/Header";
import { SearchOverlay } from "../components/SearchOverlay";
import { SavedList } from "../components/SavedList";
import { copy } from "../../lib/strings";
import { useSavedReleases } from "../hooks/useSavedReleases";
import { useSuggestions } from "../hooks/useSuggestions";

export default function SavedPage() {
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

  return (
    <main className="page">
      <Header
        active="saved"
        savedCount={savedCount}
        onChange={(view) => {
          router.push(view === "saved" ? "/saved" : "/");
        }}
        isSearchOpen={isSearchOpen}
        onSearchToggle={handleSearchToggle}
        onSearchClose={handleSearchClose}
      />
      <SearchOverlay
        title={title}
        isLoading={false}
        isOpen={isSearchOpen}
        onClose={handleSearchClose}
        onChange={(value) => setTitle(value)}
        onSubmit={handleSubmit}
        onFocus={() => setIsInputFocused(true)}
        onBlur={() => {
          blurTimeoutRef.current = setTimeout(() => {
            setIsInputFocused(false);
          }, 150);
        }}
        suggestions={suggestions}
        isFetchingSuggestions={isFetchingSuggestions}
        onSuggestionSelect={handleSuggestionSelect}
        isSuggestionSaved={isSuggestionSaved}
      />

      <section className="saved">
        <div className="saved-actions">
          <button
            type="button"
            className="secondary"
            onClick={handleRefreshAllClick}
            disabled={!isStorageReady || saved.length === 0 || isRefreshing}
          >
            {isRefreshing ? copy.actions.updating : copy.actions.updateAll}
          </button>
          {refreshMessage && <p className="hint">{refreshMessage}</p>}
        </div>
        {!isStorageReady ? (
          <p className="hint">{copy.hints.loadingList}</p>
        ) : saved.length === 0 ? (
          <p className="hint">{copy.hints.listEmpty}</p>
        ) : (
          <SavedList
            items={saved}
            onRemove={(item) => removeRelease(item.id)}
            actionsDisabled={!isStorageReady}
          />
        )}
      </section>
    </main>
  );
}
