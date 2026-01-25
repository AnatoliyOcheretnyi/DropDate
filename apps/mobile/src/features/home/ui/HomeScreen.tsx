import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ListPickerModal } from '../../../shared/ui/ListPickerModal';
import { PosterCard } from '../../../shared/ui/PosterCard';
import { colors } from '../../../shared/theme/colors';
import type { Details, ReleaseInfo, Suggestion } from '../../../shared/types/release';
import type { ListType } from '../../../shared/types/lists';
import { getBackendURL } from '../../../shared/utils/config';
import { buildFallbackRelease } from '../../../shared/utils/release';
import { useSaved } from '../../saved/store/savedStore';
import { copy } from '../../../shared/strings';

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

export default function HomeScreen() {
  const router = useRouter();
  const backendURL = useMemo(() => getBackendURL(), []);
  const { isSuggestionSaved, getListTypes, setListTypes, findByTmdbId } = useSaved();
  const queryClient = useQueryClient();
  const [pickerItem, setPickerItem] = useState<Suggestion | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const mixSuggestions = useCallback((movies: Suggestion[], series: Suggestion[]) => {
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
  }, []);

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
      mixSuggestions(homeQuery.data?.upcoming?.movies ?? [], homeQuery.data?.upcoming?.series ?? []),
    [homeQuery.data, mixSuggestions]
  );
  const popularMovies = homeQuery.data?.popular?.movies ?? [];
  const popularSeries = homeQuery.data?.popular?.series ?? [];
  const topRated = useMemo(
    () =>
      mixSuggestions(homeQuery.data?.topRated?.movies ?? [], homeQuery.data?.topRated?.series ?? []),
    [homeQuery.data, mixSuggestions]
  );

  const sections = useMemo(
    () => [
      { id: 'upcoming', title: copy.sections.upcoming, items: upcoming },
      { id: 'popularMovies', title: copy.sections.popularMovies, items: popularMovies },
      { id: 'popularSeries', title: copy.sections.popularSeries, items: popularSeries },
      { id: 'topRated', title: copy.sections.topRated, items: topRated },
    ],
    [popularMovies, popularSeries, topRated, upcoming]
  );

  const handleAdd = useCallback((item: Suggestion) => {
    setPickerItem(item);
    setPickerVisible(true);
  }, []);

  const applyListTypes = useCallback(
    async (listTypes: ListType[]) => {
      if (!pickerItem) {
        return;
      }
      const existing = findByTmdbId(pickerItem.id, pickerItem.mediaType);
      if (existing) {
        await setListTypes(
          pickerItem,
          listTypes,
          { release: existing, details: existing.details }
        );
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
        await setListTypes(
          pickerItem,
          listTypes,
          { release, details: payload.details }
        );
      } catch {
        // ignore network failures for now
      } finally {
        setPickerVisible(false);
      }
    },
    [backendURL, findByTmdbId, pickerItem, queryClient, setListTypes]
  );

  const renderRow = (items: Suggestion[]) => (
    <View style={styles.rowWrap}>
      <FlashList
        horizontal
        data={items}
        keyExtractor={(item) => `${item.mediaType}-${item.id}`}
        renderItem={({ item }) => (
          <PosterCard
            item={item}
            onPress={(selected) => router.push(`/title/${selected.mediaType}/${selected.id}`)}
            onAdd={handleAdd}
            isSaved={isSuggestionSaved(item)}
          />
        )}
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        removeClippedSubviews={false}
        contentContainerStyle={styles.row}
        ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
        estimatedItemSize={180}
      />
    </View>
  );

  return (
    <View style={styles.wrapper}>
      <FlashList
        data={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{item.title}</Text>
            {homeQuery.isLoading ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              renderRow(item.items)
            )}
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>{copy.hero.eyebrow}</Text>
            <Text style={styles.title}>{copy.appName}</Text>
            <Text style={styles.lead}>{copy.hero.mobileLead}</Text>
          </View>
        }
        contentContainerStyle={styles.container}
        estimatedItemSize={260}
        showsVerticalScrollIndicator={false}
      />
      <ListPickerModal
        visible={pickerVisible}
        value={pickerItem ? getListTypes(pickerItem) : []}
        onClose={() => setPickerVisible(false)}
        onApply={applyListTypes}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 24,
  },
  hero: {
    gap: 10,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 6,
    color: colors.eyebrow,
    fontSize: 12,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
  },
  lead: {
    color: colors.lead,
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  rowWrap: {
    marginHorizontal: -20,
  },
  row: {
    paddingHorizontal: 20,
    paddingRight: 28,
  },
  rowSeparator: {
    width: 14,
  },
});
