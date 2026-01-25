import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { Details, ReleaseInfo, Suggestion } from '../../../shared/types/release';
import { getBackendURL } from '../../../shared/utils/config';
import { buildFallbackRelease, interleaveSuggestions } from '../../../shared/utils/release';
import { useSaved } from '../../saved/store/savedStore';
import { copy } from '../../../shared/strings';
import type { ListType } from '../../../shared/types/lists';

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
  items: Suggestion[];
};

export function useHomeScreen() {
  const backendURL = useMemo(() => getBackendURL(), []);
  const { isSuggestionSaved, getListTypes, setListTypes, findByTmdbId } = useSaved();
  const queryClient = useQueryClient();
  const [pickerItem, setPickerItem] = useState<Suggestion | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const homeQuery = useQuery<Partial<HomePayload>>({
    queryKey: ['home', backendURL],
    queryFn: async () => {
      const response = await fetch(`${backendURL}/home?limit=18`, {
        headers: { accept: 'application/json' },
      });
      const payload = (await response.json()) as Partial<HomePayload>;
      if (!response.ok) {
        throw new Error('home_failed');
      }
      return payload;
    },
    staleTime: 1000 * 60 * 5,
  });

  const upcoming = useMemo(
    () =>
      interleaveSuggestions(
        homeQuery.data?.upcoming?.movies ?? [],
        homeQuery.data?.upcoming?.series ?? []
      ),
    [homeQuery.data]
  );
  const popularMovies = homeQuery.data?.popular?.movies ?? [];
  const popularSeries = homeQuery.data?.popular?.series ?? [];
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
      { id: 'upcoming', title: copy.sections.upcoming, items: upcoming },
      { id: 'popularMovies', title: copy.sections.popularMovies, items: popularMovies },
      { id: 'popularSeries', title: copy.sections.popularSeries, items: popularSeries },
      { id: 'topRated', title: copy.sections.topRated, items: topRated },
    ],
    [popularMovies, popularSeries, topRated, upcoming]
  );

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
        setPickerVisible(false);
        return;
      }
      try {
        const payload = await queryClient.fetchQuery<DetailsPayload>({
          queryKey: ['details', pickerItem.mediaType, pickerItem.id],
          queryFn: async () => {
            const response = await fetch(
              `${backendURL}/details?tmdbId=${pickerItem.id}&mediaType=${pickerItem.mediaType}`,
              { headers: { accept: 'application/json' } }
            );
            const data = (await response.json()) as DetailsPayload;
            if (!response.ok) {
              throw new Error('details_failed');
            }
            return data;
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
      } finally {
        setPickerVisible(false);
      }
    },
    [backendURL, findByTmdbId, pickerItem, queryClient, setListTypes]
  );

  return {
    sections,
    isLoading: homeQuery.isLoading,
    onAdd: openPicker,
    isSaved: isSuggestionSaved,
    pickerItem,
    pickerVisible,
    closePicker,
    applyListTypes,
    getListTypes,
  };
}
