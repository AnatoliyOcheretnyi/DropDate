import { useMemo } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../../shared/theme/palette";
import { MotionPressable } from "../../../../shared/ui/MotionPressable";
import type { SearchMode } from "../../hooks/useSearchScreen";

type Props = {
  query: string;
  onChangeQuery: (value: string) => void;
  mode: SearchMode;
  onChangeMode: (value: SearchMode) => void;
  onSubmit: () => void;
  filter: "all" | "movie" | "tv";
  onChangeFilter: (value: "all" | "movie" | "tv") => void;
  sort: "relevance" | "year" | "title";
  onChangeSort: (value: "relevance" | "year" | "title") => void;
};

const MODES: { key: SearchMode; label: string; hint: string }[] = [
  { key: "title", label: "За назвою", hint: "Наприклад, Дюна" },
  { key: "phrase", label: "За описом", hint: "Опиши, що хочеш подивитись" },
];

const SORTS: { key: "relevance" | "year" | "title"; label: string }[] = [
  { key: "relevance", label: "Релевантні" },
  { key: "year", label: "Нові" },
  { key: "title", label: "А–Я" },
];

const FILTERS: { key: "all" | "movie" | "tv"; label: string }[] = [
  { key: "all", label: "Усе" },
  { key: "movie", label: "Фільми" },
  { key: "tv", label: "Серіали" },
];

export function SearchHeader({
  query,
  onChangeQuery,
  mode,
  onChangeMode,
  onSubmit,
  filter,
  onChangeFilter,
  sort,
  onChangeSort,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const active = MODES.find((item) => item.key === mode) ?? MODES[0];

  return (
    <View style={styles.wrap}>
      {/* One field, two engines. The switch is visible up front so nobody has
          to discover that a sentence works differently from a title. */}
      <View style={styles.segmented}>
        {MODES.map((item) => {
          const isActive = item.key === mode;
          return (
            <MotionPressable
              key={item.key}
              style={[styles.segment, isActive && styles.segmentActive]}
              onPress={() => onChangeMode(item.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Пошук ${item.label.toLowerCase()}`}
            >
              <Text
                style={[
                  styles.segmentText,
                  isActive && styles.segmentTextActive,
                ]}
              >
                {item.label}
              </Text>
            </MotionPressable>
          );
        })}
      </View>

      <View style={styles.field}>
        <Ionicons
          name={mode === "phrase" ? "sparkles" : "search"}
          size={18}
          color={mode === "phrase" ? colors.accent : colors.textMuted}
        />
        <TextInput
          style={styles.input}
          placeholder={active.hint}
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={onChangeQuery}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          multiline={false}
        />
        {query.length > 0 ? (
          <MotionPressable
            style={styles.clear}
            onPress={() => onChangeQuery("")}
            accessibilityLabel="Очистити запит"
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </MotionPressable>
        ) : null}
      </View>

      {/* Phrase search costs an interpretation call, so it runs on demand. */}
      {mode === "phrase" ? (
        <MotionPressable
          style={[styles.submit, query.trim().length < 3 && styles.submitOff]}
          onPress={onSubmit}
          disabled={query.trim().length < 3}
          accessibilityLabel="Знайти за описом"
        >
          <Text style={styles.submitText}>Знайти за описом</Text>
        </MotionPressable>
      ) : (
        <>
          <View style={styles.chipRow}>
            {SORTS.map((item) => (
              <Chip
                key={item.key}
                label={item.label}
                active={sort === item.key}
                styles={styles}
                onPress={() => onChangeSort(item.key)}
              />
            ))}
          </View>
          <View style={styles.chipRow}>
            {FILTERS.map((item) => (
              <Chip
                key={item.key}
                label={item.label}
                active={filter === item.key}
                styles={styles}
                onPress={() => onChangeFilter(item.key)}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function Chip({
  label,
  active,
  styles,
  onPress,
}: {
  label: string;
  active: boolean;
  styles: ReturnType<typeof makeStyles>;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </MotionPressable>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: { gap: 12 },
    segmented: {
      flexDirection: "row",
      padding: 4,
      gap: 4,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    segment: {
      flex: 1,
      height: 38,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentActive: { backgroundColor: colors.accent },
    segmentText: {
      color: colors.textMuted,
      fontSize: 13.5,
      fontWeight: "700",
    },
    segmentTextActive: { color: colors.isDark ? "#05231a" : "#ffffff" },
    field: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    input: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
    },
    clear: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    submit: {
      height: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },
    submitOff: { opacity: 0.45 },
    submitText: {
      color: colors.isDark ? "#05231a" : "#ffffff",
      fontSize: 14,
      fontWeight: "800",
    },
    chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
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
  });
