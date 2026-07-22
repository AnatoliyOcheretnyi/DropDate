import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ListPickerModal } from "../../../shared/ui/ListPickerModal";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { PosterGrid } from "../../../shared/ui/PosterGrid";
import { ScreenHeader } from "../../../shared/ui/ScreenHeader";
import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
import type { Suggestion } from "../../../shared/types/release";
import { useListPicker } from "../../saved/hooks/useListPicker";
import { discover } from "../api/browse";
import {
  COUNTRIES,
  GENRES,
  describeSelection,
  type Filter,
} from "../model/filters";

export default function BrowseScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const picker = useListPicker();

  const [genres, setGenres] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const hasSelection = genres.length > 0 || countries.length > 0;

  const query = useInfiniteQuery({
    queryKey: ["browse", genres, countries],
    enabled: hasSelection,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      discover({ genres, countries, page: pageParam }, signal),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    staleTime: 1000 * 60 * 5,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.results) ?? [],
    [query.data],
  );

  const toggle = useCallback(
    (setter: (fn: (prev: string[]) => string[]) => void, id: string) => {
      void Haptics.selectionAsync();
      setter((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    },
    [],
  );

  const handlePress = useCallback(
    (item: Suggestion) => router.push(`/title/${item.mediaType}/${item.id}`),
    [router],
  );

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage)
      void query.fetchNextPage();
  }, [query]);

  const header = (
    <View style={styles.filters}>
      <FilterGroup
        label="Жанри"
        items={GENRES}
        selected={genres}
        onToggle={(id) => toggle(setGenres, id)}
        styles={styles}
      />
      <FilterGroup
        label="Країни"
        items={COUNTRIES}
        selected={countries}
        onToggle={(id) => toggle(setCountries, id)}
        styles={styles}
      />
      {hasSelection ? (
        <View style={styles.summary}>
          <Text style={styles.summaryText} numberOfLines={2}>
            {describeSelection(genres, countries)}
          </Text>
          <MotionPressable
            style={styles.reset}
            accessibilityLabel="Скинути фільтри"
            onPress={() => {
              setGenres([]);
              setCountries([]);
            }}
          >
            <Text style={styles.resetText}>Скинути</Text>
          </MotionPressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Під твій смак"
        subtitle="Обери жанр чи країну — зберемо добірку"
      />
      <PosterGrid
        items={items}
        isLoading={hasSelection && query.isLoading}
        onPress={handlePress}
        onAdd={picker.openPicker}
        isSaved={picker.isSaved}
        ListHeaderComponent={header}
        onEndReached={loadMore}
        ListEmptyComponent={
          <Text style={styles.hint}>
            {hasSelection
              ? query.isError
                ? "Не вдалося завантажити. Спробуй інші фільтри."
                : "За цим підбором нічого не знайшлось."
              : "Постав хоча б один фільтр — і тут зʼявиться добірка."}
          </Text>
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <Text style={styles.hint}>Завантажуємо ще…</Text>
          ) : null
        }
      />
      <ListPickerModal
        visible={picker.pickerVisible}
        value={picker.pickerItem ? picker.getListTypes(picker.pickerItem) : []}
        onClose={picker.closePicker}
        onApply={picker.applyListTypes}
      />
    </View>
  );
}

function FilterGroup({
  label,
  items,
  selected,
  onToggle,
  styles,
}: {
  label: string;
  items: Filter[];
  selected: string[];
  onToggle: (id: string) => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {items.map((item) => {
          const active = selected.includes(item.id);
          return (
            <MotionPressable
              key={item.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onToggle(item.id)}
              accessibilityLabel={item.label}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
            >
              <Text style={styles.chipIcon}>{item.icon}</Text>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {item.label}
              </Text>
            </MotionPressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    filters: { gap: 18, paddingBottom: 20 },
    group: { gap: 8 },
    groupLabel: {
      textTransform: "uppercase",
      letterSpacing: 2,
      color: colors.accent,
      fontSize: 11.5,
      fontWeight: "800",
    },
    // Rails bleed to the screen edges while the grid keeps its padding.
    chipRow: { gap: 8, paddingRight: 20 },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 44,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    chipIcon: { fontSize: 15 },
    chipText: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
    chipTextActive: { color: colors.text },
    summary: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingTop: 2,
    },
    summaryText: { flex: 1, color: colors.textMuted, fontSize: 13.5 },
    reset: {
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: colors.elevated,
    },
    resetText: { color: colors.text, fontSize: 13.5, fontWeight: "800" },
    hint: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
      paddingVertical: 32,
    },
  });
