"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Suggestion } from "../../../shared/lib/release";
import type { ListType } from "../../../shared/types/releases";
import { AppPageShell } from "../../../widgets/AppPageShell";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { useAuth } from "../../../shared/state/auth";
import { useSuggestions } from "../../../shared/hooks/useSuggestions";
import { useRecommendations } from "../hooks/useRecommendations";
import { useHomeSections } from "../hooks/useHomeSections";
import { HomeHero } from "../components/HomeHero";
import { DiscoverySection } from "../components/DiscoverySection";
import { HomeCalendar } from "../components/HomeCalendar";
import { NewReleases } from "../components/NewReleases";
import { UpcomingRail } from "../components/UpcomingRail";
import { TopTen } from "../components/TopTen";
import { TasteChips } from "../components/TasteChips";
import { Reveal } from "../../../shared/ui/Reveal";
import { DailyPickCard, DailyPickEmpty } from "../components/DailyPickCard";
import { useDailyPick } from "../hooks/useDailyPick";
import { TasteOnboarding } from "../components/TasteOnboarding";
import { ContinueWatching } from "../components/ContinueWatching";
import { useToasts } from "../../../shared/hooks/useToasts";
import { ToastStack } from "../../../shared/ui/ToastStack";

type Props = {
  sections: {
    upcoming: Suggestion[];
    popularMovies: Suggestion[];
    popularSeries: Suggestion[];
    topRated: Suggestion[];
  };
};

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
  const [, setIsInputFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toasts, pushToast, dismissToast } = useToasts();
  const router = useRouter();
  const searchParams = useSearchParams();
  const handleClearSelection = useCallback(() => {
    setSelectedSuggestion(null);
  }, []);

  const { saved, isSuggestionSaved, getListTypes, setSuggestionLists } =
    useSavedReleases();
  const { user } = useAuth();
  const isSignedIn = Boolean(user);

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
    itemsWithReasons: recommendationsWithReasons,
    isLoading: isRecommendationsLoading,
    isRefreshing: isRecommendationsRefreshing,
    refresh: refreshRecommendations,
  } = useRecommendations();
  const { pick: dailyPick, state: dailyPickState, isLoading: isDailyPickLoading, isUpdating: isUpdatingDailyPick, reveal: revealDailyPick, setAction: setDailyPickAction } = useDailyPick();
  const { suggestions, isFetching: isFetchingSuggestions } = useSuggestions(
    title,
    selectedSuggestion,
    handleClearSelection
  );

  const homeSectionsQuery = useHomeSections(sections);
  const sectionState = homeSectionsQuery.data ?? sections;

  // The cold-start overlay invalidates queries once the backend wakes, so the
  // rails just follow the query's own fetching state.
  const isTrendingRefreshing = homeSectionsQuery.isFetching;

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
  // Everything the page already has loaded doubles as the "surprise me" pool,
  // so the die roll is instant and never hits the network.
  const surprisePool = useMemo(() => heroItems.slice(1), [heroItems]);

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
      <TasteOnboarding emphasis="overlay" />
      <HomeHero
        spotlight={spotlight}
        surprisePool={surprisePool}
        isSuggestionSaved={isSuggestionSaved}
        getListTypes={getListTypes}
        onChangeLists={handleChangeLists}
      />
      <ContinueWatching />

      {isSignedIn && !dailyPick && !isDailyPickLoading ? (
        <Reveal>
          <DailyPickEmpty />
        </Reveal>
      ) : null}

      {dailyPick ? (
        <Reveal>
          <DailyPickCard
            pick={dailyPick}
            saved={getListTypes({ id: dailyPick.tmdbId, mediaType: dailyPick.mediaType, title: dailyPick.title, year: dailyPick.year, posterUrl: dailyPick.posterUrl }).includes("watchlist")}
            action={dailyPickState?.action ?? "none"}
            revealed={dailyPickState?.revealed === true}
            busy={isUpdatingDailyPick}
            onReveal={() => {
              void revealDailyPick().then((result) => {
                if (!result.ok) {
                  pushToast(result.message, "warning");
                }
              });
            }}
            onSelect={handleGallerySelect}
            onToggleSave={(suggestion) => {
              const current = getListTypes(suggestion);
              if (!current.includes("watchlist")) {
                handleChangeLists(suggestion, [...current, "watchlist"]);
              }
              void setDailyPickAction("saved").then((result) => {
                if (!result.ok) {
                  pushToast(result.message, "warning");
                }
              });
            }}
            onDislike={() => {
              void setDailyPickAction("disliked").then((result) => {
                if (!result.ok) {
                  pushToast(result.message, "warning");
                }
              });
            }}
          />
        </Reveal>
      ) : null}

      <Reveal>
        <DiscoverySection
          recommendations={recommendationsWithReasons}
          isLoading={isRecommendationsLoading}
          onRefresh={refreshRecommendations}
          isRefreshing={isRecommendationsRefreshing}
          fallbackItems={sectionState.popularMovies}
          onSelect={handleGallerySelect}
        />
      </Reveal>

      <Reveal>
        <HomeCalendar isSignedIn={isSignedIn} />
      </Reveal>

      <Reveal>
        <UpcomingRail
          items={sectionState.upcoming}
          isLoading={isTrendingRefreshing}
          getListTypes={getListTypes}
          onChangeLists={handleChangeLists}
          onSelect={handleGallerySelect}
        />
      </Reveal>

      {shouldShowTrending ? (
        <Reveal>
          <NewReleases
            movies={sectionState.popularMovies}
            series={sectionState.popularSeries}
            isLoading={isTrendingRefreshing}
            getListTypes={getListTypes}
            onChangeLists={handleChangeLists}
            onSelect={handleGallerySelect}
          />
        </Reveal>
      ) : null}

      <Reveal>
        <TopTen items={sectionState.popularMovies} onSelect={handleGallerySelect} />
      </Reveal>

      <Reveal>
        <TasteChips
          onSelect={handleGallerySelect}
          getListTypes={getListTypes}
          onChangeLists={handleChangeLists}
        />
      </Reveal>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
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
