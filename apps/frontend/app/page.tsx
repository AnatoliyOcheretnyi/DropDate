"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Details, ReleaseInfo, Suggestion } from "../lib/release";
import { Header } from "./components/Header";
import { SavedList } from "./components/SavedList";
import { TrendingCarousel } from "./components/TrendingCarousel";
import { copy } from "../lib/strings";
import { useSavedReleases } from "./hooks/useSavedReleases";
import { useSuggestions } from "./hooks/useSuggestions";

function HomePageContent() {
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<Suggestion | null>(null);
  const [trendingMovies, setTrendingMovies] = useState<Suggestion[]>([]);
  const [trendingSeries, setTrendingSeries] = useState<Suggestion[]>([]);
  const [isTrendingLoading, setIsTrendingLoading] = useState(false);
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
    addRelease,
    removeRelease,
    isSuggestionSaved,
    refreshAll,
    isRefreshing,
  } = useSavedReleases();
  const [addingSuggestionId, setAddingSuggestionId] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<"home" | "saved">("home");
  const { suggestions, isFetching: isFetchingSuggestions } = useSuggestions(
    title,
    selectedSuggestion,
    handleClearSelection
  );
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const loadTrending = useCallback(async () => {
    setIsTrendingLoading(true);
    try {
      const response = await fetch("/api/trending?window=week&limit=18", {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        setTrendingMovies([]);
        setTrendingSeries([]);
        return;
      }
      const movies = (payload?.movies as Suggestion[]) || [];
      const series = (payload?.series as Suggestion[]) || [];
      setTrendingMovies(movies);
      setTrendingSeries(series);
    } catch {
      setTrendingMovies([]);
      setTrendingSeries([]);
    } finally {
      setIsTrendingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeView !== "home") {
      return;
    }
    if (
      trendingMovies.length > 0 ||
      trendingSeries.length > 0 ||
      isTrendingLoading
    ) {
      return;
    }
    loadTrending();
  }, [
    activeView,
    isTrendingLoading,
    loadTrending,
    trendingMovies.length,
    trendingSeries.length,
  ]);

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

  const buildFallbackRelease = useCallback(
    (details: Details, mediaType: Suggestion["mediaType"]): ReleaseInfo | null => {
      const dateSource =
        details.nextAirDate ||
        details.releaseDate ||
        details.lastAirDate ||
        details.firstAirDate;
      if (!dateSource) {
        return null;
      }
      const parsed = new Date(dateSource);
      const isValid = !Number.isNaN(parsed.getTime());
      const dateValue = isValid ? parsed.toISOString() : dateSource;
      const isFuture = isValid ? parsed.getTime() > Date.now() : false;
      const status =
        mediaType === "movie"
          ? isFuture
            ? "upcoming"
            : "released"
          : details.status?.toLowerCase().includes("ended")
          ? "ended"
          : details.status?.toLowerCase().includes("canceled")
          ? "ended"
          : details.nextAirDate && isFuture
          ? "upcoming"
          : details.lastAirDate
          ? "ended"
          : "upcoming";

      return {
        title: details.title,
        type: mediaType === "movie" ? "movie" : "series",
        nextRelease: dateValue,
        source: "tmdb",
        posterUrl: details.posterUrl,
        backdropUrl: details.backdropUrl,
        status,
      };
    },
    []
  );

  const handleAddSuggestion = useCallback(
    async (suggestion: Suggestion) => {
      if (isSuggestionSaved(suggestion)) {
        return;
      }
      setAddingSuggestionId(suggestion.id);
      try {
        const response = await fetch(
          `/api/details?tmdbId=${suggestion.id}&mediaType=${suggestion.mediaType}`,
          { cache: "no-store" }
        );
        const payload = await response.json();
        if (!response.ok || !payload?.details) {
          return;
        }
        const release: ReleaseInfo | null =
          payload.release ||
          buildFallbackRelease(payload.details as Details, suggestion.mediaType);
        if (!release) {
          return;
        }
        addRelease(release, {
          tmdbId: suggestion.id,
          mediaType: suggestion.mediaType,
        });
      } finally {
        setAddingSuggestionId(null);
      }
    },
    [addRelease, buildFallbackRelease, isSuggestionSaved]
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
              <p className="lead">
                {copy.hero.webLead}
              </p>
            </div>
          </section>

          {shouldShowTrending && (
            <>
              <TrendingCarousel
                title={copy.sections.trendingMovies}
                items={trendingMovies}
                isLoading={isTrendingLoading}
                onSelect={handleGallerySelect}
                isSaved={isSuggestionSaved}
                isBusy={() => false}
              />
              <TrendingCarousel
                title={copy.sections.trendingSeries}
                items={trendingSeries}
                isLoading={isTrendingLoading}
                onSelect={handleGallerySelect}
                isSaved={isSuggestionSaved}
                isBusy={() => false}
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
            <p className="hint">
              {copy.hints.listEmpty}
            </p>
          ) : (
            <SavedList
              items={saved}
              onRemove={removeRelease}
              actionsDisabled={!isStorageReady}
            />
          )}
        </section>
      )}
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<main className="page" />}>
      <HomePageContent />
    </Suspense>
  );
}
