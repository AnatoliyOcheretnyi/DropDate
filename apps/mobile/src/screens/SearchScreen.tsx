import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { PosterCard } from '../components/PosterCard';
import { colors } from '../theme/colors';
import type { Details, ReleaseInfo, Suggestion } from '../types/release';
import { getBackendURL } from '../utils/config';
import { buildFallbackRelease } from '../utils/release';
import { useSaved } from '../state/SavedContext';

type SearchPayload = {
  results: Suggestion[];
  page: number;
  totalPages: number;
  totalResults: number;
};

type DetailsPayload = {
  details: Details;
  release?: ReleaseInfo;
};

export default function SearchScreen() {
  const router = useRouter();
  const backendURL = useMemo(() => getBackendURL(), []);
  const { addRelease, isSuggestionSaved } = useSaved();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv'>('all');

  useEffect(() => {
    const trimmed = query.trim();
    let cancelled = false;

    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsSuggesting(false);
      return;
    }

    setIsSuggesting(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `${backendURL}/suggest?query=${encodeURIComponent(trimmed)}&limit=6`,
          { headers: { accept: 'application/json' } }
        );
        const payload = await response.json();
        if (!cancelled) {
          setSuggestions(response.ok ? (payload?.results ?? []) : []);
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setIsSuggesting(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [backendURL, query]);

  const loadResults = useCallback(
    async (nextPage: number, append: boolean) => {
      const trimmed = query.trim();
      if (!trimmed) {
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch(
          `${backendURL}/search?query=${encodeURIComponent(trimmed)}&page=${nextPage}`,
          { headers: { accept: 'application/json' } }
        );
        const payload = (await response.json()) as SearchPayload;
        if (!response.ok) {
          setResults([]);
          setPage(1);
          setTotalPages(1);
          return;
        }
        setResults((prev) => (append ? [...prev, ...payload.results] : payload.results));
        setPage(payload.page || nextPage);
        setTotalPages(payload.totalPages || 1);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [backendURL, query]
  );

  const handleSearch = useCallback(() => {
    setSuggestions([]);
    setPage(1);
    loadResults(1, false);
  }, [loadResults]);

  const handleSuggestionPress = (item: Suggestion) => {
    setQuery(item.title);
    setSuggestions([]);
    router.push(`/title/${item.mediaType}/${item.id}`);
  };

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

  const filteredResults = useMemo(() => {
    if (filter === 'all') {
      return results;
    }
    return results.filter((item) => item.mediaType === filter);
  }, [filter, results]);

  return (
    <View style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>Пошук</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Наприклад, Dune"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <Pressable style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Знайти</Text>
          </Pressable>
        </View>

        {isSuggesting && <Text style={styles.hint}>Підбираємо варіанти…</Text>}
        {suggestions.length > 0 && (
          <View style={styles.suggestionList}>
            {suggestions.map((item) => (
              <Pressable
                key={`${item.mediaType}-${item.id}`}
                style={styles.suggestionItem}
                onPress={() => handleSuggestionPress(item)}
              >
                <Text style={styles.suggestionTitle}>{item.title}</Text>
                <Text style={styles.suggestionMeta}>
                  {item.mediaType === 'movie' ? 'Фільм' : 'Серіал'}
                  {item.year ? ` · ${item.year}` : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.filterRow}>
          {(['all', 'movie', 'tv'] as const).map((value) => (
            <Pressable
              key={value}
              style={[styles.filterChip, filter === value ? styles.filterActive : null]}
              onPress={() => setFilter(value)}
            >
              <Text style={styles.filterText}>
                {value === 'all' ? 'Усі' : value === 'movie' ? 'Фільми' : 'Серіали'}
              </Text>
            </Pressable>
          ))}
        </View>

        <FlatList
          data={filteredResults}
          keyExtractor={(item) => `${item.mediaType}-${item.id}`}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <PosterCard
              item={item}
              size={{ width: 150, height: 220 }}
              onPress={(selected) => router.push(`/title/${selected.mediaType}/${selected.id}`)}
              onAdd={handleAdd}
              isSaved={isSuggestionSaved(item)}
            />
          )}
          ListEmptyComponent={
            isLoading ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.hint}>Нічого не знайдено.</Text>
          }
        />

        {page < totalPages && (
          <Pressable style={styles.loadMore} onPress={() => loadResults(page + 1, true)} disabled={isLoading}>
            <Text style={styles.loadMoreText}>{isLoading ? 'Завантажуємо…' : 'Показати ще'}</Text>
          </Pressable>
        )}
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
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  searchButton: {
    borderRadius: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  searchButtonText: {
    color: '#001b12',
    fontWeight: '700',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
  },
  suggestionList: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestionTitle: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  suggestionMeta: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterActive: {
    borderColor: colors.accent,
  },
  filterText: {
    color: colors.text,
    fontSize: 12,
  },
  gridRow: {
    gap: 12,
    paddingBottom: 12,
  },
  loadMore: {
    alignSelf: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  loadMoreText: {
    color: colors.text,
  },
});
