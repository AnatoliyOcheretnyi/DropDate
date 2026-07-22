import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import type { Suggestion } from "../../../shared/types/release";
import { apiRequest } from "../../../shared/api/client";
import { queryKeys } from "../../../shared/api/queryKeys";
import { interleaveSuggestions } from "../../../shared/utils/release";
import { useListPicker } from "../../saved/hooks/useListPicker";
import { copy } from "../../../shared/strings";
import { useAuthStore } from "../../auth/store/authStore";
import { getRecommendations } from "../../recommendations/api/recommendations";
import type { CollectionId } from "../../collection/api/collection";

type HomePayload = {
  upcoming: {
    movies: Suggestion[];
    series: Suggestion[];
  };
  popular: {
    movies: Suggestion[];
    series: Suggestion[];
  };
  topRated: {
    movies: Suggestion[];
    series: Suggestion[];
  };
};

export type HomeSection = {
  id: string;
  title: string;
  kicker?: string;
  variant?: "rail" | "ranked";
  items: Suggestion[];
  reasons?: string[];
  /** Matches a key in `collectionConfig`; drives the "Усі" button. */
  collectionId?: CollectionId;
};

export function useHomeScreen() {
  const isAuthenticated = useAuthStore((state) =>
    Boolean(state.user && state.accessToken),
  );
  const picker = useListPicker();

  const homeQuery = useQuery<Partial<HomePayload>>({
    queryKey: queryKeys.home(18),
    queryFn: ({ signal }) =>
      apiRequest<Partial<HomePayload>>("/home?limit=18", { signal }),
    staleTime: 1000 * 60 * 5,
  });
  const recommendationsQuery = useQuery({
    queryKey: queryKeys.recommendations,
    enabled: isAuthenticated,
    queryFn: ({ signal }) => getRecommendations(signal),
  });

  const upcoming = useMemo(
    () =>
      interleaveSuggestions(
        homeQuery.data?.upcoming?.movies ?? [],
        homeQuery.data?.upcoming?.series ?? [],
      ),
    [homeQuery.data],
  );
  const popularMovies = useMemo(
    () => homeQuery.data?.popular?.movies ?? [],
    [homeQuery.data],
  );
  const popularSeries = useMemo(
    () => homeQuery.data?.popular?.series ?? [],
    [homeQuery.data],
  );
  const personalized = useMemo<Suggestion[]>(
    () =>
      (recommendationsQuery.data?.items ?? []).map((item) => ({
        id: item.tmdbId,
        mediaType: item.mediaType,
        title: item.title,
        year: item.year,
        posterUrl: item.posterUrl,
      })),
    [recommendationsQuery.data],
  );
  const topRated = useMemo(
    () =>
      interleaveSuggestions(
        homeQuery.data?.topRated?.movies ?? [],
        homeQuery.data?.topRated?.series ?? [],
      ),
    [homeQuery.data],
  );

  const sections = useMemo<HomeSection[]>(
    () => [
      ...(personalized.length
        ? [
            {
              id: "personalized",
              title: "Рекомендовано для тебе",
              kicker: "На основі улюблених і переглянутих",
              items: personalized,
              collectionId: "personalized" as const,
              reasons: (recommendationsQuery.data?.items ?? [])
                .map((item) => item.reason.text)
                .filter((x): x is string => Boolean(x))
                .slice(0, 2),
            },
          ]
        : []),
      {
        id: "upcoming",
        title: copy.sections.upcoming,
        kicker: "Календар релізів",
        items: upcoming,
        collectionId: "upcoming" as const,
      },
      {
        id: "popularMovies",
        title: copy.sections.popularMovies,
        kicker: "Топ-10 · що дивляться зараз",
        variant: "ranked" as const,
        items: popularMovies,
        collectionId: "popularMovies" as const,
      },
      {
        id: "popularSeries",
        title: copy.sections.popularSeries,
        kicker: "Серіальний потік",
        items: popularSeries,
        collectionId: "popularSeries" as const,
      },
      {
        id: "topRated",
        title: copy.sections.topRated,
        kicker: "Високі оцінки",
        items: topRated,
        collectionId: "topRated" as const,
      },
    ],
    [
      personalized,
      popularMovies,
      popularSeries,
      recommendationsQuery.data,
      topRated,
      upcoming,
    ],
  );

  const spotlightPool = useMemo<Suggestion[]>(() => {
    const seen = new Set<string>();
    return [
      ...upcoming,
      ...popularMovies,
      ...popularSeries,
      ...topRated,
    ].filter((item) => {
      const key = `${item.mediaType}-${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [upcoming, popularMovies, popularSeries, topRated]);
  const spotlight = spotlightPool[0] ?? null;
  const supporting = useMemo(() => spotlightPool.slice(1, 7), [spotlightPool]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const refetch = useCallback(async () => {
    // Own the flag instead of reading `homeQuery.isRefetching`: the spinner
    // has to stay up until the recommendations leg settles too.
    setIsRefreshing(true);
    try {
      await Promise.all([
        homeQuery.refetch(),
        isAuthenticated ? recommendationsQuery.refetch() : Promise.resolve(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [homeQuery, isAuthenticated, recommendationsQuery]);

  return {
    sections,
    spotlight,
    supporting,
    isLoading: homeQuery.isLoading,
    // Only a hard failure with nothing cached is worth blocking the screen —
    // a stale catalogue from MMKV still beats an error page.
    isError: homeQuery.isError && !homeQuery.data,
    error: homeQuery.error,
    isRefreshing,
    refetch,
    onAdd: picker.openPicker,
    isSaved: picker.isSaved,
    pickerItem: picker.pickerItem,
    pickerVisible: picker.pickerVisible,
    closePicker: picker.closePicker,
    applyListTypes: picker.applyListTypes,
    getListTypes: picker.getListTypes,
  };
}
