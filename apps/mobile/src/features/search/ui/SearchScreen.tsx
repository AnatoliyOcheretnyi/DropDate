import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';

import { ListPickerModal } from '../../../shared/ui/ListPickerModal';
import { PosterCard } from '../../../shared/ui/PosterCard';
import { colors } from '../../../shared/theme/colors';
import type { Details, ReleaseInfo, Suggestion } from '../../../shared/types/release';
import type { ListType } from '../../../shared/types/lists';
import { getBackendURL } from '../../../shared/utils/config';
import { buildFallbackRelease } from '../../../shared/utils/release';
import { useSaved } from '../../saved/store/savedStore';
import { copy } from '../../../shared/strings';

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
  const { isSuggestionSaved, setListTypes, getListTypes, findByTmdbId } = useSaved();
  const [pickerItem, setPickerItem] = useState<Suggestion | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<Suggestion[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv'>('all');

  useEffect(() => {
    const trimmed = query.trim();
    const timer = setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const loadResults = useCallback(
    async (nextPage: number, append: boolean) => {
      const trimmed = debouncedQuery.trim();
      if (!trimmed) {
        setResults([]);
        setPage(1);
        setTotalPages(1);
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
    [backendURL, debouncedQuery]
  );

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setPage(1);
      setTotalPages(1);
      return;
    }
    setPage(1);
    loadResults(1, false);
  }, [debouncedQuery, loadResults]);

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
        await setListTypes(pickerItem, listTypes, {
          release: existing,
          details: existing.details,
        });
        setPickerVisible(false);
        return;
      }
      try {
        const response = await fetch(
          `${backendURL}/details?tmdbId=${pickerItem.id}&mediaType=${pickerItem.mediaType}`,
          { headers: { accept: 'application/json' } }
        );
        const payload = (await response.json()) as DetailsPayload;
        if (!response.ok || !payload.details) {
          return;
        }
        const release =
          payload.release || buildFallbackRelease(payload.details as Details, pickerItem.mediaType);
        if (!release) {
          return;
        }
        await setListTypes(pickerItem, listTypes, {
          release,
          details: payload.details,
        });
      } catch {
        // ignore network failures for now
      } finally {
        setPickerVisible(false);
      }
    },
    [backendURL, findByTmdbId, pickerItem, setListTypes]
  );

  const filteredResults = useMemo(() => {
    if (filter === 'all') {
      return results;
    }
    return results.filter((item) => item.mediaType === filter);
  }, [filter, results]);

  return (
    <View style={styles.wrapper}>
      <FlashList
        data={filteredResults}
        keyExtractor={(item) => `${item.mediaType}-${item.id}`}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <PosterCard
            item={item}
            size={{ width: 150, height: 220 }}
            onPress={(selected) => router.push(`/title/${selected.mediaType}/${selected.id}`)}
            onAdd={handleAdd}
            isSaved={isSuggestionSaved(item)}
          />
        )}
        estimatedItemSize={220}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.header}>{copy.sections.search}</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder={copy.search.placeholder}
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
              />
            </View>

            <View style={styles.filterRow}>
              {(['all', 'movie', 'tv'] as const).map((value) => (
                <Pressable
                  key={value}
                  style={[styles.filterChip, filter === value ? styles.filterActive : null]}
                  onPress={() => setFilter(value)}
                >
                  <Text style={styles.filterText}>
                    {value === 'all'
                      ? copy.filters.all
                      : value === 'movie'
                      ? copy.filters.movies
                      : copy.filters.series}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text style={styles.hint}>{copy.search.empty}</Text>
          )
        }
        ListFooterComponent={
          page < totalPages ? (
            <Pressable
              style={styles.loadMore}
              onPress={() => loadResults(page + 1, true)}
              disabled={isLoading}
            >
              <Text style={styles.loadMoreText}>
                {isLoading ? copy.hints.loadingResults : copy.actions.loadMore}
              </Text>
            </Pressable>
          ) : null
        }
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
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
  headerWrap: {
    gap: 16,
  },
  inputRow: {
    flexDirection: 'row',
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
  hint: {
    color: colors.textMuted,
    fontSize: 12,
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
