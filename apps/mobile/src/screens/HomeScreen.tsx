import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PosterCard } from '../components/PosterCard';
import { colors } from '../theme/colors';
import type { Details, ReleaseInfo, Suggestion } from '../types/release';
import { getBackendURL } from '../utils/config';
import { buildFallbackRelease } from '../utils/release';
import { useSaved } from '../state/SavedContext';

type TrendingPayload = {
  movies: Suggestion[];
  series: Suggestion[];
};

type DetailsPayload = {
  details: Details;
  release?: ReleaseInfo;
};

export default function HomeScreen() {
  const router = useRouter();
  const backendURL = useMemo(() => getBackendURL(), []);
  const { addRelease, isSuggestionSaved } = useSaved();

  const [movies, setMovies] = useState<Suggestion[]>([]);
  const [series, setSeries] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTrending = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${backendURL}/trending?window=week&limit=16`, {
        headers: { accept: 'application/json' },
      });
      const payload = (await response.json()) as TrendingPayload;
      if (response.ok) {
        setMovies(payload.movies ?? []);
        setSeries(payload.series ?? []);
      } else {
        setMovies([]);
        setSeries([]);
      }
    } catch {
      setMovies([]);
      setSeries([]);
    } finally {
      setIsLoading(false);
    }
  }, [backendURL]);

  useEffect(() => {
    loadTrending();
  }, [loadTrending]);

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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items.map((item) => (
        <PosterCard
          key={`${item.mediaType}-${item.id}`}
          item={item}
          onPress={(selected) => router.push(`/title/${selected.mediaType}/${selected.id}`)}
          onAdd={handleAdd}
          isSaved={isSuggestionSaved(item)}
        />
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>beta</Text>
          <Text style={styles.title}>DropDate</Text>
          <Text style={styles.lead}>
            Стеж за фільмами й серіалами. Показуємо, коли буде наступний реліз або нова серія.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Фільми в тренді</Text>
          {isLoading ? <ActivityIndicator color={colors.accent} /> : renderRow(movies)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Серіали в тренді</Text>
          {isLoading ? <ActivityIndicator color={colors.accent} /> : renderRow(series)}
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
  row: {
    gap: 14,
    paddingRight: 12,
  },
});
