import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NotificationBell } from "../../../shared/ui/NotificationBell";

import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
import { copy } from "../../../shared/strings";
import { SavedHeader } from "./components/SavedHeader";
import { SavedFiltersSheet } from "./components/SavedFiltersSheet";
import { SavedSection } from "./components/SavedSection";
import { useSavedScreen, type SavedSort } from "../hooks/useSavedScreen";

const SORT_LABELS: Record<SavedSort, string> = {
  default: "За замовч.",
  release: "За датою",
  rating: "За оцінкою",
  alpha: "А–Я",
};

export default function SavedScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const {
    activeList,
    setActiveList,
    counts,
    sort,
    setSort,
    query,
    setQuery,
    genres,
    genreFacets,
    toggleGenre,
    decades,
    decadeFacets,
    toggleDecade,
    resetFilters,
    isFiltered,
    tabItems,
    listItems,
    sections,
    stats,
    removeRelease,
  } = useSavedScreen();

  return (
    <View style={styles.wrapper}>
      <NotificationBell />
      <FlashList
        data={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SavedSection
            title={item.title}
            items={item.items}
            activeList={activeList}
            onRemove={removeRelease}
          />
        )}
        ListHeaderComponent={
          <SavedHeader
            activeList={activeList}
            onChangeList={setActiveList}
            counts={counts}
            stats={stats}
            query={query}
            onChangeQuery={setQuery}
            onOpenFilters={() => setFiltersOpen(true)}
            activeFilterCount={genres.length + decades.length}
            sortLabel={SORT_LABELS[sort]}
          />
        }
        ListEmptyComponent={
          // A filtered-to-nothing list is not an empty library: saying so is
          // what tells the user the reset button is the way out.
          isFiltered && tabItems.length > 0 ? (
            <Text style={styles.hint}>
              За цими фільтрами нічого немає. Спробуй прибрати рік або жанр.
            </Text>
          ) : listItems.length === 0 ? (
            <Text style={styles.hint}>{copy.hints.listEmpty}</Text>
          ) : null
        }
        contentContainerStyle={{
          ...styles.container,
          // Clears the floating bell.
          paddingTop: Math.max(insets.top + 8, 18) + 52,
        }}
        showsVerticalScrollIndicator={false}
      />

      <SavedFiltersSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        sort={sort}
        onChangeSort={setSort}
        genreFacets={genreFacets}
        selectedGenres={genres}
        onToggleGenre={toggleGenre}
        decadeFacets={decadeFacets}
        selectedDecades={decades}
        onToggleDecade={toggleDecade}
        isFiltered={isFiltered}
        onReset={resetFilters}
        shownCount={listItems.length}
      />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      paddingHorizontal: 20,
      paddingBottom: 148,
      gap: 18,
    },
    hint: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
  });
