"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Suggestion } from "../../../shared/lib/release";
import type { ListType } from "../../../shared/types/releases";
import { AppPageShell } from "../../../widgets/AppPageShell";
import { TrendingCarousel } from "../components/TrendingCarousel";
import { copy } from "../../../shared/lib/strings";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { useSuggestions } from "../../../shared/hooks/useSuggestions";
import { pingBackend } from "../api/homeApi";
import { useRecommendations } from "../hooks/useRecommendations";
import { useHomeSections } from "../hooks/useHomeSections";
import { HomeShowcase } from "../components/HomeShowcase";
import { FeatureTiles } from "../components/FeatureTiles";
import { TasteChips } from "../components/TasteChips";
import { RankedRail } from "../components/RankedRail";
import { MoodTeaser } from "../components/MoodTeaser";
import { Reveal } from "../../../shared/ui/Reveal";

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

const uniqueSuggestions = (items: Suggestion[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.mediaType}-${item.id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

function HomeScreenContent({ sections }: Props) {
  const [title, setTitle] = useState("");
  const isLoading = false;
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<Suggestion | null>(null);
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

  const { saved, isSuggestionSaved, getListTypes, setSuggestionLists } =
    useSavedReleases();

  const handleChangeLists = useCallback(
    (suggestion: Suggestion, next: ListType[]) => {
      setSuggestionLists(suggestion, next, {
        title: suggestion.title,
        type: suggestion.mediaType === "movie" ? "movie" : "series",
        nextRelease: "",
        source: "tmdb",
        posterUrl: suggestion.posterUrl,
        status: "released",
      });
    },
    [setSuggestionLists]
  );
  const {
    items: recommendations,
    isLoading: isRecommendationsLoading,
  } = useRecommendations();
  const { suggestions, isFetching: isFetchingSuggestions } = useSuggestions(
    title,
    selectedSuggestion,
    handleClearSelection
  );

  const homeSectionsQuery = useHomeSections(sections);
  const sectionState = homeSectionsQuery.data ?? sections;

  const refreshHome = useCallback(async () => {
    setIsTrendingRefreshing(true);
    try {
      await homeSectionsQuery.refetch();
    } catch {
      // ignore refresh errors; we'll retry on next health check
    } finally {
      setIsTrendingRefreshing(false);
    }
  }, [homeSectionsQuery]);

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
        const isHealthy = await pingBackend();
        if (isHealthy) {
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

  const heroItems = useMemo(
    () =>
      uniqueSuggestions([
        ...sectionState.upcoming,
        ...sectionState.popularMovies,
        ...sectionState.popularSeries,
        ...sectionState.topRated,
      ]),
    [sectionState]
  );
  const spotlight = heroItems[0] ?? null;
  const supportingSpotlightItems = useMemo(
    () => heroItems.slice(1, 7),
    [heroItems]
  );

  return (
    <main className="page page--home">
      <AppPageShell
        active="home"
        savedCount={saved.length}
        onChange={(view) => {
          router.push(view === "saved" ? "/saved" : "/");
        }}
        isSearchOpen={isSearchOpen}
        onSearchToggle={handleSearchToggle}
        onSearchClose={handleSearchClose}
        searchOverlay={{
          title,
          isLoading,
          isOpen: isSearchOpen,
          onClose: handleSearchClose,
          onChange: setTitle,
          onSubmit: handleSubmit,
          onFocus: () => setIsInputFocused(true),
          onBlur: () => {
            blurTimeoutRef.current = setTimeout(() => {
              setIsInputFocused(false);
            }, 150);
          },
          suggestions,
          isFetchingSuggestions,
          onSuggestionSelect: handleSuggestionSelect,
          isSuggestionSaved,
        }}
      >
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
      <HomeShowcase
        spotlight={spotlight}
        supportingItems={supportingSpotlightItems}
        onSearchOpen={handleSearchToggle}
        onSelect={handleGallerySelect}
        getListTypes={getListTypes}
        onChangeLists={handleChangeLists}
      />

      <Reveal>
        <FeatureTiles savedCount={saved.length} />
      </Reveal>

      <Reveal>
        <TasteChips />
      </Reveal>

      {shouldShowTrending && (
        <>
          {recommendations.length > 0 && (
            <Reveal>
              <TrendingCarousel
                title={copy.sections.recommendations}
                kicker="На основі ваших улюблених і переглянутих"
                items={recommendations}
                isLoading={isRecommendationsLoading}
                onSelect={handleGallerySelect}
                getListTypes={getListTypes}
                onChangeLists={handleChangeLists}
              />
            </Reveal>
          )}
          <Reveal>
            <TrendingCarousel
              title={copy.sections.upcoming}
              kicker="Календар релізів"
              items={sectionState.upcoming}
              isLoading={isTrendingRefreshing}
              onSelect={handleGallerySelect}
              getListTypes={getListTypes}
              onChangeLists={handleChangeLists}
            />
          </Reveal>
          <Reveal>
            <RankedRail
              title={copy.sections.popularMovies}
              kicker="Топ-10 · що дивляться зараз"
              items={sectionState.popularMovies}
              onSelect={handleGallerySelect}
            />
          </Reveal>
          <Reveal>
            <TrendingCarousel
              title={copy.sections.popularSeries}
              kicker="Серіальний потік"
              items={sectionState.popularSeries}
              isLoading={isTrendingRefreshing}
              onSelect={handleGallerySelect}
              getListTypes={getListTypes}
              onChangeLists={handleChangeLists}
            />
          </Reveal>
          <Reveal>
            <TrendingCarousel
              title={copy.sections.topRated}
              kicker="Високі оцінки"
              items={sectionState.topRated}
              isLoading={isTrendingRefreshing}
              onSelect={handleGallerySelect}
              getListTypes={getListTypes}
              onChangeLists={handleChangeLists}
            />
          </Reveal>
          <Reveal>
            <MoodTeaser />
          </Reveal>
        </>
      )}
      </AppPageShell>
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
