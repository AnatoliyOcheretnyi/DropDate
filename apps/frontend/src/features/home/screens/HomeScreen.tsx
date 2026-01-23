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
  sections: {
    upcoming: Suggestion[];
    popularMovies: Suggestion[];
    popularSeries: Suggestion[];
    topRated: Suggestion[];
  };
};

type BackendStatus = "idle" | "checking" | "waking" | "ready";

const mixSuggestions = (movies: Suggestion[], series: Suggestion[]) => {
  const mixed: Suggestion[] = [];
  const max = Math.max(movies.length, series.length);
  for (let i = 0; i < max; i += 1) {
    if (movies[i]) {
      mixed.push(movies[i]);
    }
    if (series[i]) {
      mixed.push(series[i]);
    }
  }
  return mixed;
};

function HomeScreenContent({ sections }: Props) {
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<Suggestion | null>(null);
  const [sectionState, setSectionState] = useState(sections);
  const [isTrendingRefreshing, setIsTrendingRefreshing] = useState(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("idle");
  const [, setIsInputFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backendCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backendBannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backendAttemptsRef = useRef(0);
  const hasWakeAttemptRef = useRef(false);
  const hadWakeFailureRef = useRef(false);
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
    setSectionState(sections);
  }, [sections]);

  const refreshHome = useCallback(async () => {
    setIsTrendingRefreshing(true);
    try {
      const response = await fetch("/api/home?limit=18", {
        headers: { accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        upcoming?: { movies?: Suggestion[]; series?: Suggestion[] };
        popular?: { movies?: Suggestion[]; series?: Suggestion[] };
        topRated?: { movies?: Suggestion[]; series?: Suggestion[] };
      };

      const upcomingMovies = payload?.upcoming?.movies ?? [];
      const upcomingSeries = payload?.upcoming?.series ?? [];
      const popularMovies = payload?.popular?.movies ?? [];
      const popularSeries = payload?.popular?.series ?? [];
      const topRatedMovies = payload?.topRated?.movies ?? [];
      const topRatedSeries = payload?.topRated?.series ?? [];

      const nextSections = {
        upcoming: mixSuggestions(upcomingMovies, upcomingSeries),
        popularMovies,
        popularSeries,
        topRated: mixSuggestions(topRatedMovies, topRatedSeries),
      };
      setSectionState(nextSections);
    } catch {
      // ignore refresh errors; we'll retry on next health check
    } finally {
      setIsTrendingRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const hasContent =
      sectionState.upcoming.length > 0 ||
      sectionState.popularMovies.length > 0 ||
      sectionState.popularSeries.length > 0 ||
      sectionState.topRated.length > 0;

    if (hasContent || hasWakeAttemptRef.current) {
      return;
    }

    hasWakeAttemptRef.current = true;

    const wakeBackend = async () => {
      backendAttemptsRef.current += 1;
      try {
        const response = await fetch("/api/health", {
          headers: { accept: "application/json" },
          cache: "no-store",
        });
        if (response.ok) {
          if (hadWakeFailureRef.current) {
            setBackendStatus("ready");
          }
          backendAttemptsRef.current = 0;
          await refreshHome();
          if (backendBannerTimeoutRef.current) {
            clearTimeout(backendBannerTimeoutRef.current);
          }
          if (hadWakeFailureRef.current) {
            backendBannerTimeoutRef.current = setTimeout(() => {
              setBackendStatus("idle");
              hadWakeFailureRef.current = false;
            }, 2400);
          }
          return;
        }
      } catch {
        // ignore
      }
      hadWakeFailureRef.current = true;
      setBackendStatus("waking");
      const delay = Math.min(5000, 900 + backendAttemptsRef.current * 600);
      backendCheckTimeoutRef.current = setTimeout(wakeBackend, delay);
    };

    wakeBackend();
    return () => {
      if (backendCheckTimeoutRef.current) {
        clearTimeout(backendCheckTimeoutRef.current);
      }
      if (backendBannerTimeoutRef.current) {
        clearTimeout(backendBannerTimeoutRef.current);
      }
    };
  }, [refreshHome, sectionState]);

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
    <main className="page page--home">
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
          className={`backend-status-toast backend-status-toast--${backendStatus}`}
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
            title={copy.sections.upcoming}
            items={sectionState.upcoming}
            isLoading={isTrendingRefreshing}
            onSelect={handleGallerySelect}
            getListTypes={getListTypes}
          />
          <TrendingCarousel
            title={copy.sections.popularMovies}
            items={sectionState.popularMovies}
            isLoading={isTrendingRefreshing}
            onSelect={handleGallerySelect}
            getListTypes={getListTypes}
          />
          <TrendingCarousel
            title={copy.sections.popularSeries}
            items={sectionState.popularSeries}
            isLoading={isTrendingRefreshing}
            onSelect={handleGallerySelect}
            getListTypes={getListTypes}
          />
          <TrendingCarousel
            title={copy.sections.topRated}
            items={sectionState.topRated}
            isLoading={isTrendingRefreshing}
            onSelect={handleGallerySelect}
            getListTypes={getListTypes}
          />
        </>
      )}
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
