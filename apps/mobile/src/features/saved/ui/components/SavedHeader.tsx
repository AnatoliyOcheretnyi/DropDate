import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../../shared/theme/palette";
import { copy } from "../../../../shared/strings";
import { MotionPressable } from "../../../../shared/ui/MotionPressable";
import type { SavedTab } from "../../hooks/useSavedScreen";

type Stat = {
  value: string | number;
  label: string;
  tone?: "warm" | "cool";
};

type Props = {
  activeList: SavedTab;
  onChangeList: (list: SavedTab) => void;
  counts: Record<SavedTab, number>;
  stats: { left: Stat; middle: Stat; right: Stat };
  query: string;
  onChangeQuery: (value: string) => void;
  /** Chips and sorting live in the sheet; the header only opens it. */
  onOpenFilters: () => void;
  activeFilterCount: number;
  sortLabel: string;
};

const LISTS: { key: SavedTab; label: string }[] = [
  { key: "all", label: "Усі" },
  { key: "follow", label: "Стежу" },
  { key: "watchlist", label: "Хочу" },
  { key: "favorite", label: "Улюблене" },
  { key: "liked", label: "Сподобалось" },
  { key: "watched", label: "Переглянуто" },
  { key: "disliked", label: "Не зайшло" },
];

export function SavedHeader({
  activeList,
  onChangeList,
  counts,
  stats,
  query,
  onChangeQuery,
  onOpenFilters,
  activeFilterCount,
  sortLabel,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>{copy.header.savedList}</Text>

      <View style={styles.stats}>
        {[stats.left, stats.middle, stats.right].map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <Row styles={styles}>
        {LISTS.map((item) => (
          <Chip
            key={item.key}
            label={item.label}
            count={counts[item.key] ?? 0}
            active={activeList === item.key}
            styles={styles}
            onPress={() => onChangeList(item.key)}
          />
        ))}
      </Row>

      <View style={styles.search}>
        <Ionicons name="search" size={17} color={colors.textMuted} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Пошук у списку"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <MotionPressable
            style={styles.clear}
            onPress={() => onChangeQuery("")}
            accessibilityLabel="Очистити пошук"
          >
            <Ionicons name="close-circle" size={17} color={colors.textMuted} />
          </MotionPressable>
        ) : null}
      </View>

      <View style={styles.actions}>
        <MotionPressable
          style={[styles.filters, activeFilterCount > 0 && styles.filtersOn]}
          onPress={onOpenFilters}
          accessibilityLabel="Відкрити фільтри"
        >
          <Ionicons
            name="options"
            size={16}
            color={activeFilterCount > 0 ? colors.accent : colors.textMuted}
          />
          <Text
            style={[
              styles.filtersText,
              activeFilterCount > 0 && styles.filtersTextOn,
            ]}
          >
            Фільтри
          </Text>
          {activeFilterCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </MotionPressable>

        <MotionPressable
          style={styles.sortButton}
          onPress={onOpenFilters}
          accessibilityLabel={`Сортування: ${sortLabel}`}
        >
          <Ionicons name="swap-vertical" size={15} color={colors.textMuted} />
          <Text style={styles.sortText}>{sortLabel}</Text>
        </MotionPressable>
      </View>
    </View>
  );
}

function Row({
  children,
  styles,
}: {
  children: React.ReactNode;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {children}
    </ScrollView>
  );
}

function Chip({
  label,
  count,
  active,
  styles,
  onPress,
}: {
  label: string;
  count?: number;
  active: boolean;
  styles: ReturnType<typeof makeStyles>;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      accessibilityState={{ selected: active }}
      accessibilityLabel={
        count === undefined ? label : `${label}, ${count} тайтлів`
      }
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
      {count === undefined ? null : (
        <Text style={[styles.chipCount, active && styles.chipTextActive]}>
          {count}
        </Text>
      )}
    </MotionPressable>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: { gap: 14 },
    header: {
      color: colors.text,
      fontSize: 30,
      fontWeight: "900",
      letterSpacing: -0.6,
    },
    stats: { flexDirection: "row", gap: 10 },
    stat: {
      flex: 1,
      gap: 2,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statValue: { color: colors.text, fontSize: 20, fontWeight: "800" },
    statLabel: {
      color: colors.eyebrow,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    row: { gap: 8, paddingRight: 20 },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 13,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    chipText: { color: colors.textMuted, fontSize: 12.5, fontWeight: "700" },
    chipTextActive: { color: colors.accent },
    chipCount: { color: colors.eyebrow, fontSize: 11, fontWeight: "700" },
    search: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      height: 48,
      paddingHorizontal: 15,
      borderRadius: 15,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    input: { flex: 1, color: colors.text, fontSize: 14.5 },
    clear: {
      width: 26,
      height: 26,
      alignItems: "center",
      justifyContent: "center",
    },
    actions: { flexDirection: "row", gap: 10 },
    filters: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 15,
      paddingVertical: 11,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filtersOn: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    filtersText: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
    filtersTextOn: { color: colors.accent },
    badge: {
      minWidth: 18,
      height: 18,
      paddingHorizontal: 5,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },
    badgeText: {
      color: colors.isDark ? "#05231a" : "#ffffff",
      fontSize: 11,
      fontWeight: "800",
    },
    sortButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 15,
      paddingVertical: 11,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sortText: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  });
