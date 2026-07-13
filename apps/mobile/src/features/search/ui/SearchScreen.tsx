import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';

import { PosterCard } from '../../../shared/ui/PosterCard';
import { NotificationBell } from '../../../shared/ui/NotificationBell';
import { colors } from '../../../shared/theme/colors';
import { copy } from '../../../shared/strings';
import type { Suggestion } from '../../../shared/types/release';
import { SearchHeader } from './components/SearchHeader';
import { useSearchScreen } from '../hooks/useSearchScreen';

export default function SearchScreen() {
  const router = useRouter();
  const {
    query,
    setQuery,
    filter,
    setFilter,
    filteredResults,
    isLoading,
    page,
    totalPages,
    loadResults,
    handleAdd,
    isSuggestionSaved,
  } = useSearchScreen();

  const handlePress = useCallback(
    (item: Suggestion) => {
      router.push(`/title/${item.mediaType}/${item.id}`);
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: Suggestion }) => (
      <PosterCard
        item={item}
        size={{ width: 150, height: 220 }}
        onPress={handlePress}
        onAdd={handleAdd}
        isSaved={isSuggestionSaved(item)}
      />
    ),
    [handleAdd, handlePress, isSuggestionSaved]
  );

  return (
    <View style={styles.wrapper}>
      <NotificationBell />
      <FlashList
        data={filteredResults}
        keyExtractor={(item) => `${item.mediaType}-${item.id}`}
        numColumns={2}
        renderItem={renderItem}
        ListHeaderComponent={
          <SearchHeader
            query={query}
            onChangeQuery={setQuery}
            filter={filter}
            onChangeFilter={setFilter}
          />
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
    paddingBottom: 148,
    gap: 16,
  },
  hint: {
    color: colors.textMuted,
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
