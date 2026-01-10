"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Suggestion } from "../../lib/release";
import { Header } from "./Header";
import { SavedList } from "./SavedList";
import { TrendingCarousel } from "./TrendingCarousel";
import { copy } from "../../lib/strings";
import { useSavedReleases } from "../hooks/useSavedReleases";
import { useSuggestions } from "../hooks/useSuggestions";

type Props = {
  trendingMovies: Suggestion[];
  trendingSeries: Suggestion[];
};

function HomeClientContent({ trendingMovies, trendingSeries }: Props) {
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<Suggestion | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const handleClearSelection = useCallback(() => {
    setSelectedSuggestion(null);
  }, []);

  const {
    saved,
    isReady: isStorageReady,
    removeRelease,
    isSuggestionSaved,
    getListTypes,
    refreshAll,
    isRefreshing,
  } = useSavedReleases();
  const [activeView, setActiveView] = useState<"home" | "saved">("home");
  const { suggestions, isFetching: isFetchingSuggestions } = useSuggestions(
    title,
    selectedSuggestion,
    handleClearSelection
  );
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  useEffect(() => {
    if (activeView !== "home") {
      setIsInputFocused(false);
      setIsSearchOpen(false);
    }
  }, [activeView]);

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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

  const handleGallerySelect = useCallback(
    (suggestion: Suggestion) => {
      setSelectedSuggestion(suggestion);
      setIsInputFocused(false);
      setIsSearchOpen(false);
      setTitle(suggestion.title);
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

  const shouldShowSuggestions =
    activeView === "home" &&
    isSearchOpen &&
    isInputFocused &&
    suggestions.length > 0;
  const shouldShowTrending = activeView === "home" && !selectedSuggestion;

  useEffect(() => {
    if (shouldShowSuggestions) {
      document.body.classList.add("no-scroll");
      return () => {
        document.body.classList.remove("no-scroll");
      };
    }
    document.body.classList.remove("no-scroll");
    return undefined;
  }, [shouldShowSuggestions]);

  const handleSearchToggle = () => {
    setIsSearchOpen((prev) => !prev);
    setActiveView("home");
  };

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false);
    setIsInputFocused(false);
  }, []);

  useEffect(() => {
    if (searchParams.get("view") === "saved") {
      setActiveView("saved");
    }
  }, [searchParams]);

  return (
    <main className="page">
      <Header
        active={activeView}
        savedCount={saved.length}
        onChange={setActiveView}
        title={title}
        isLoading={isLoading}
        isSearchOpen={isSearchOpen}
        onSearchToggle={handleSearchToggle}
        onSearchClose={handleSearchClose}
        onSearchChange={(value) => {
          setTitle(value);
        }}
        onSearchSubmit={handleSubmit}
        onSearchFocus={() => setIsInputFocused(true)}
        onSearchBlur={() => {
          blurTimeoutRef.current = setTimeout(() => {
            setIsInputFocused(false);
          }, 150);
        }}
        suggestions={suggestions}
        isFetchingSuggestions={isFetchingSuggestions}
        onSuggestionSelect={handleSuggestionSelect}
        isSuggestionSaved={isSuggestionSaved}
      />

      {activeView === "home" && (
        <>
          <section className="hero hero-bleed">
            <div className="hero-inner">
              <p className="eyebrow">{copy.hero.eyebrow}</p>
              <h1>{copy.appName}</h1>
              <p className="lead">{copy.hero.webLead}</p>
            </div>
          </section>

          {shouldShowTrending && (
            <>
              <TrendingCarousel
                title={copy.sections.trendingMovies}
                items={trendingMovies}
                isLoading={false}
                onSelect={handleGallerySelect}
                getListTypes={getListTypes}
              />
              <TrendingCarousel
                title={copy.sections.trendingSeries}
                items={trendingSeries}
                isLoading={false}
                onSelect={handleGallerySelect}
                getListTypes={getListTypes}
              />
            </>
          )}
        </>
      )}

      {activeView === "saved" && (
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
      )}
    </main>
  );
}

export function HomeClient(props: Props) {
  return (
    <Suspense fallback={<main className="page" />}>
      <HomeClientContent {...props} />
    </Suspense>
  );
}
