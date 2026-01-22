"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Suggestion } from "../../../shared/lib/release";
import { Header } from "../../../widgets/Header";
import { SearchOverlay } from "../../../widgets/SearchOverlay";
import { TrendingCarousel } from "../components/TrendingCarousel";
import { copy } from "../../../shared/lib/strings";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { useSuggestions } from "../../../shared/hooks/useSuggestions";

type Props = {
  trendingMovies: Suggestion[];
  trendingSeries: Suggestion[];
};

type BackendStatus = "idle" | "checking" | "waking" | "ready";

function HomeScreenContent({ trendingMovies, trendingSeries }: Props) {
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<Suggestion | null>(null);
  const [trendingMoviesState, setTrendingMoviesState] =
    useState<Suggestion[]>(trendingMovies);
  const [trendingSeriesState, setTrendingSeriesState] =
    useState<Suggestion[]>(trendingSeries);
  const [isTrendingRefreshing, setIsTrendingRefreshing] = useState(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");
  const [, setIsInputFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backendCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backendBannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backendAttemptsRef = useRef(0);
  const trendingCountsRef = useRef({ movies: trendingMovies.length, series: trendingSeries.length });
  const router = useRouter();
  const searchParams = useSearchParams();
  const handleClearSelection = useCallback(() => {
    setSelectedSuggestion(null);
  }, []);

  const { saved, isSuggestionSaved, getListTypes } = useSavedReleases();
  const { suggestions, isFetching: isFetchingSuggestions } = useSuggestions(
    title,
    selectedSuggestion,
    handleClearSelection
  );

  useEffect(() => {
    setTrendingMoviesState(trendingMovies);
    setTrendingSeriesState(trendingSeries);
    trendingCountsRef.current = {
      movies: trendingMovies.length,
      series: trendingSeries.length,
    };
  }, [trendingMovies, trendingSeries]);

  const refreshTrending = useCallback(async () => {
    setIsTrendingRefreshing(true);
    try {
      const response = await fetch("/api/trending?window=week&limit=18", {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as {
        movies?: Suggestion[];
        series?: Suggestion[];
      };
      const nextMovies = payload?.movies ?? [];
      const nextSeries = payload?.series ?? [];
      setTrendingMoviesState(nextMovies);
      setTrendingSeriesState(nextSeries);
      trendingCountsRef.current = {
        movies: nextMovies.length,
        series: nextSeries.length,
      };
    } catch {
      // ignore refresh errors; we'll retry on next health check
    } finally {
      setIsTrendingRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const checkBackend = async () => {
      backendAttemptsRef.current += 1;
      setBackendStatus((prev) =>
        prev === "ready"
          ? prev
          : backendAttemptsRef.current === 1
          ? "checking"
          : "waking"
      );
      try {
        const response = await fetch("/api/health", {
          headers: { accept: "application/json" },
          cache: "no-store",
        });
      if (response.ok) {
        const hadRetries = backendAttemptsRef.current > 1;
        const { movies, series } = trendingCountsRef.current;
        const shouldRefreshTrending =
          hadRetries || (movies === 0 && series === 0);
        setBackendStatus("ready");
        backendAttemptsRef.current = 0;
        if (shouldRefreshTrending) {
          refreshTrending();
        }
        if (backendBannerTimeoutRef.current) {
          clearTimeout(backendBannerTimeoutRef.current);
        }
          backendBannerTimeoutRef.current = setTimeout(() => {
            setBackendStatus("idle");
          }, 2400);
          return;
        }
      } catch {
        // ignore
      }
      const delay = Math.min(4000, 700 + backendAttemptsRef.current * 400);
      backendCheckTimeoutRef.current = setTimeout(checkBackend, delay);
    };

    checkBackend();
    return () => {
      if (backendCheckTimeoutRef.current) {
        clearTimeout(backendCheckTimeoutRef.current);
      }
      if (backendBannerTimeoutRef.current) {
        clearTimeout(backendBannerTimeoutRef.current);
      }
    };
  }, [refreshTrending]);

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

  const shouldShowTrending = !selectedSuggestion;

  useEffect(() => {
    if (searchParams.get("view") === "saved") {
      router.push("/saved");
    }
  }, [searchParams, router]);

  const handleSearchToggle = () => {
    setIsSearchOpen((prev) => !prev);
  };

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false);
    setIsInputFocused(false);
  }, []);

  return (
    <main className="page">
      <Header
        active="home"
        savedCount={saved.length}
        onChange={(view) => {
          router.push(view === "saved" ? "/saved" : "/");
        }}
        isSearchOpen={isSearchOpen}
        onSearchToggle={handleSearchToggle}
        onSearchClose={handleSearchClose}
      />
      {backendStatus !== "idle" && (
        <div
          className={`backend-status-banner backend-status-banner--${backendStatus}`}
          role="status"
        >
          <span className="backend-status-dot" aria-hidden="true" />
          <span>
            {backendStatus === "ready"
              ? copy.hints.backendReady
              : backendStatus === "checking"
              ? copy.hints.backendChecking
              : copy.hints.backendWaking}
          </span>
        </div>
      )}
      <SearchOverlay
        title={title}
        isLoading={isLoading}
        isOpen={isSearchOpen}
        onClose={handleSearchClose}
        onChange={(value) => {
          setTitle(value);
        }}
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
              items={trendingMoviesState}
              isLoading={isTrendingRefreshing}
              onSelect={handleGallerySelect}
              getListTypes={getListTypes}
            />
            <TrendingCarousel
              title={copy.sections.trendingSeries}
              items={trendingSeriesState}
              isLoading={isTrendingRefreshing}
              onSelect={handleGallerySelect}
              getListTypes={getListTypes}
            />
          </>
        )}
      </>
    </main>
  );
}

export function HomeScreen(props: Props) {
  return (
    <Suspense fallback={<main className="page" />}>
      <HomeScreenContent {...props} />
    </Suspense>
  );
}
