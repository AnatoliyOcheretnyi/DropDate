import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { Details, ReleaseInfo, Suggestion } from '../../../shared/types/release';
import { apiRequest } from '../../../shared/api/client';
import { queryKeys } from '../../../shared/api/queryKeys';
import { buildFallbackRelease, interleaveSuggestions } from '../../../shared/utils/release';
import { useSaved } from '../../saved/hooks/useSaved';
import { copy } from '../../../shared/strings';
import type { ListType } from '../../../shared/types/lists';
import { useAuthStore } from '../../auth/store/authStore';
import { getRecommendations } from '../../recommendations/api/recommendations';

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

type DetailsPayload = {
  details: Details;
  release?: ReleaseInfo;
};

export type HomeSection = {
  id: string;
  title: string;
  kicker?: string;
  variant?: 'rail' | 'ranked';
  items: Suggestion[];
  reasons?: string[];
};

export function useHomeScreen() {
  const isAuthenticated = useAuthStore((state) => Boolean(state.user && state.accessToken));
  const { isSuggestionSaved, getListTypes, setListTypes, findByTmdbId } = useSaved();
  const queryClient = useQueryClient();
  const [pickerItem, setPickerItem] = useState<Suggestion | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const homeQuery = useQuery<Partial<HomePayload>>({
    queryKey: queryKeys.home(18),
    queryFn: ({ signal }) => apiRequest<Partial<HomePayload>>('/home?limit=18', { signal }),
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
        homeQuery.data?.upcoming?.series ?? []
      ),
    [homeQuery.data]
  );
  const popularMovies = useMemo(() => homeQuery.data?.popular?.movies ?? [], [homeQuery.data]);
  const popularSeries = useMemo(() => homeQuery.data?.popular?.series ?? [], [homeQuery.data]);
  const personalized = useMemo<Suggestion[]>(() => (recommendationsQuery.data?.items ?? []).map((item) => ({
    id: item.tmdbId, mediaType: item.mediaType, title: item.title, year: item.year, posterUrl: item.posterUrl,
  })), [recommendationsQuery.data]);
  const topRated = useMemo(
    () =>
      interleaveSuggestions(
        homeQuery.data?.topRated?.movies ?? [],
        homeQuery.data?.topRated?.series ?? []
      ),
    [homeQuery.data]
  );

  const sections = useMemo<HomeSection[]>(
    () => [
      ...(personalized.length ? [{ id: 'personalized', title: 'Рекомендовано для тебе', kicker: 'На основі улюблених і переглянутих', items: personalized, reasons: (recommendationsQuery.data?.items ?? []).map(item => item.reason.text).filter((x): x is string => Boolean(x)).slice(0, 2) }] : []),
      { id: 'upcoming', title: copy.sections.upcoming, kicker: 'Календар релізів', items: upcoming },
      { id: 'popularMovies', title: copy.sections.popularMovies, kicker: 'Топ-10 · що дивляться зараз', variant: 'ranked', items: popularMovies },
      { id: 'popularSeries', title: copy.sections.popularSeries, kicker: 'Серіальний потік', items: popularSeries },
      { id: 'topRated', title: copy.sections.topRated, kicker: 'Високі оцінки', items: topRated },
    ],
    [personalized, popularMovies, popularSeries, recommendationsQuery.data, topRated, upcoming]
  );

  const spotlightPool = useMemo<Suggestion[]>(() => {
    const seen = new Set<string>();
    return [...upcoming, ...popularMovies, ...popularSeries, ...topRated].filter((item) => {
      const key = `${item.mediaType}-${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [upcoming, popularMovies, popularSeries, topRated]);
  const spotlight = spotlightPool[0] ?? null;
  const supporting = useMemo(() => spotlightPool.slice(1, 7), [spotlightPool]);

  const refetch = useCallback(async () => {
    await Promise.all([
      homeQuery.refetch(),
      isAuthenticated ? recommendationsQuery.refetch() : Promise.resolve(),
    ]);
  }, [homeQuery, isAuthenticated, recommendationsQuery]);

  const openPicker = useCallback((item: Suggestion) => {
    setPickerItem(item);
    setPickerVisible(true);
  }, []);

  const closePicker = useCallback(() => {
    setPickerVisible(false);
  }, []);

  const applyListTypes = useCallback(
    async (listTypes: ListType[]) => {
      if (!pickerItem) {
        return;
      }
      const existing = findByTmdbId(pickerItem.id, pickerItem.mediaType);
      if (existing) {
        await setListTypes(pickerItem, listTypes, {
          release: existing,
          details: existing.details,
        });
        return;
      }
      try {
        const payload = await queryClient.fetchQuery<DetailsPayload>({
          queryKey: ['details', pickerItem.mediaType, pickerItem.id],
          queryFn: async () => {
            return apiRequest<DetailsPayload>(`/details?tmdbId=${pickerItem.id}&mediaType=${pickerItem.mediaType}`);
          },
          staleTime: 1000 * 60 * 10,
        });

        if (!payload.details) {
          return;
        }
        const release =
          payload.release || buildFallbackRelease(payload.details as Details, pickerItem.mediaType);
        if (!release) {
          return;
        }
        await setListTypes(pickerItem, listTypes, { release, details: payload.details });
      } catch {
        // ignore network failures for now
      }
    },
    [findByTmdbId, pickerItem, queryClient, setListTypes]
  );

  return {
    sections,
    spotlight,
    supporting,
    isLoading: homeQuery.isLoading,
    isRefreshing: homeQuery.isRefetching,
    refetch,
    onAdd: openPicker,
    isSaved: isSuggestionSaved,
    pickerItem,
    pickerVisible,
    closePicker,
    applyListTypes,
    getListTypes,
  };
}
