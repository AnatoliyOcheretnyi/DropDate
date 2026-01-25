import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';

import { PosterCard } from '../../../shared/ui/PosterCard';
import { colors } from '../../../shared/theme/colors';
import type { Details, ReleaseInfo, Suggestion } from '../../../shared/types/release';
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
  const { addRelease, isSuggestionSaved } = useSaved();

  const [upcoming, setUpcoming] = useState<Suggestion[]>([]);
  const [popularMovies, setPopularMovies] = useState<Suggestion[]>([]);
  const [popularSeries, setPopularSeries] = useState<Suggestion[]>([]);
  const [topRated, setTopRated] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  const loadHome = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${backendURL}/home?limit=18`, {
        headers: { accept: 'application/json' },
      });
      const payload = (await response.json()) as Partial<HomePayload>;
      if (response.ok) {
        const upcomingMovies = payload.upcoming?.movies ?? [];
        const upcomingSeries = payload.upcoming?.series ?? [];
        const popularMoviesPayload = payload.popular?.movies ?? [];
        const popularSeriesPayload = payload.popular?.series ?? [];
        const topRatedMovies = payload.topRated?.movies ?? [];
        const topRatedSeries = payload.topRated?.series ?? [];

        setUpcoming(mixSuggestions(upcomingMovies, upcomingSeries));
        setPopularMovies(popularMoviesPayload);
        setPopularSeries(popularSeriesPayload);
        setTopRated(mixSuggestions(topRatedMovies, topRatedSeries));
      } else {
        setUpcoming([]);
        setPopularMovies([]);
        setPopularSeries([]);
        setTopRated([]);
      }
    } catch {
      setUpcoming([]);
      setPopularMovies([]);
      setPopularSeries([]);
      setTopRated([]);
    } finally {
      setIsLoading(false);
    }
  }, [backendURL, mixSuggestions]);

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  const handleAdd = useCallback(
    async (item: Suggestion) => {
      if (isSuggestionSaved(item)) {
        return;
      }
      try {
        const response = await fetch(`${backendURL}/details?tmdbId=${item.id}&mediaType=${item.mediaType}`, {
          headers: { accept: 'application/json' },
        });
        const payload = (await response.json()) as DetailsPayload;
        if (!response.ok || !payload.details) {
          return;
        }
        const release =
          payload.release || buildFallbackRelease(payload.details as Details, item.mediaType);
        if (!release) {
          return;
        }
        addRelease(release, {
          tmdbId: item.id,
          mediaType: item.mediaType,
          details: payload.details,
        });
      } catch {
        // ignore network failures for now
      }
    },
    [addRelease, backendURL, isSuggestionSaved]
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
        contentContainerStyle={styles.row}
        ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
        estimatedItemSize={180}
      />
    </View>
  );

  return (
    <View style={styles.wrapper}>
      <ScrollView
        nestedScrollEnabled
        directionalLockEnabled
        contentContainerStyle={styles.container}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{copy.hero.eyebrow}</Text>
          <Text style={styles.title}>{copy.appName}</Text>
          <Text style={styles.lead}>
            {copy.hero.mobileLead}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.sections.upcoming}</Text>
          {isLoading ? <ActivityIndicator color={colors.accent} /> : renderRow(upcoming)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.sections.popularMovies}</Text>
          {isLoading ? <ActivityIndicator color={colors.accent} /> : renderRow(popularMovies)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.sections.popularSeries}</Text>
          {isLoading ? <ActivityIndicator color={colors.accent} /> : renderRow(popularSeries)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.sections.topRated}</Text>
          {isLoading ? <ActivityIndicator color={colors.accent} /> : renderRow(topRated)}
        </View>
      </ScrollView>
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
