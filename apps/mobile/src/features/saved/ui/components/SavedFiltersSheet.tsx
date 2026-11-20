import { useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../../shared/theme/palette";
import type { Decade } from "../../../../shared/decades";
import { MotionPressable } from "../../../../shared/ui/MotionPressable";
import type { SavedSort } from "../../hooks/useSavedScreen";

type Props = {
  visible: boolean;
  onClose: () => void;
  sort: SavedSort;
  onChangeSort: (value: SavedSort) => void;
  genreFacets: { genre: string; count: number }[];
  selectedGenres: string[];
  onToggleGenre: (genre: string) => void;
  decadeFacets: { decade: Decade; count: number }[];
  selectedDecades: string[];
  onToggleDecade: (id: string) => void;
  isFiltered: boolean;
  onReset: () => void;
  /** Rows the current selection leaves on screen — the sheet's whole point. */
  shownCount: number;
};

const SORTS: { key: SavedSort; label: string }[] = [
  { key: "default", label: "За замовчуванням" },
  { key: "release", label: "За датою" },
  { key: "rating", label: "За оцінкою" },
  { key: "alpha", label: "А–Я" },
];

/**
 * Filters live in a sheet, not in the feed: three chip rows above the list
 * pushed the titles themselves off the first screen.
 */
export function SavedFiltersSheet({
  visible,
  onClose,
  sort,
  onChangeSort,
  genreFacets,
  selectedGenres,
  onToggleGenre,
  decadeFacets,
  selectedDecades,
  onToggleDecade,
  isFiltered,
  onReset,
  shownCount,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Закрити фільтри"
      />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />

        <View style={styles.head}>
          <Text style={styles.title}>Фільтри</Text>
          {isFiltered ? (
            <MotionPressable
              style={styles.reset}
              onPress={onReset}
              accessibilityLabel="Скинути фільтри"
            >
              <Text style={styles.resetText}>Скинути</Text>
            </MotionPressable>
          ) : null}
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Both facet rows stay hidden while there is nothing to choose
              between — a filter that cannot narrow anything is noise. */}
          {decadeFacets.length > 1 ? (
            <Group label="Роки" styles={styles}>
              {decadeFacets.map(({ decade, count }) => (
                <Chip
                  key={decade.id}
                  label={decade.label}
                  count={count}
                  active={selectedDecades.includes(decade.id)}
                  styles={styles}
                  onPress={() => onToggleDecade(decade.id)}
                />
              ))}
            </Group>
          ) : null}

          {genreFacets.length > 1 ? (
            <Group label="Жанри" styles={styles}>
              {genreFacets.map((facet) => (
                <Chip
                  key={facet.genre}
                  label={facet.genre}
                  count={facet.count}
                  active={selectedGenres.includes(facet.genre)}
                  styles={styles}
                  onPress={() => onToggleGenre(facet.genre)}
                />
              ))}
            </Group>
          ) : null}

          <Group label="Сортування" styles={styles}>
            {SORTS.map((item) => (
              <Chip
                key={item.key}
                label={item.label}
                active={sort === item.key}
                styles={styles}
                onPress={() => onChangeSort(item.key)}
              />
            ))}
          </Group>
        </ScrollView>

        <MotionPressable
          style={styles.apply}
          onPress={onClose}
          accessibilityLabel={`Показати ${shownCount} тайтлів`}
        >
          <Text style={styles.applyText}>Показати {shownCount}</Text>
          <Ionicons
            name="arrow-forward"
            size={16}
            color={colors.isDark ? "#05231a" : "#ffffff"}
          />
        </MotionPressable>
      </View>
    </Modal>
  );
}

function Group({
  label,
  children,
  styles,
}: {
  label: string;
  children: React.ReactNode;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label.toUpperCase()}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
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
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.isDark
        ? "rgba(3,6,10,0.66)"
        : "rgba(11,15,20,0.32)",
    },
    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: "82%",
      paddingHorizontal: 20,
      paddingTop: 10,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderColor: colors.border,
      gap: 14,
    },
    handle: {
      alignSelf: "center",
      width: 36,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.border,
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: { color: colors.text, fontSize: 20, fontWeight: "800" },
    reset: { paddingVertical: 6, paddingHorizontal: 4 },
    resetText: { color: colors.textMuted, fontSize: 13.5, fontWeight: "700" },
    body: { flexGrow: 0 },
    bodyContent: { gap: 18, paddingBottom: 4 },
    group: { gap: 9 },
    groupLabel: {
      color: colors.eyebrow,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.4,
    },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
    chipText: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
    chipTextActive: { color: colors.accent },
    chipCount: { color: colors.eyebrow, fontSize: 11.5, fontWeight: "700" },
    apply: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: 50,
      borderRadius: 15,
      backgroundColor: colors.accent,
    },
    applyText: {
      color: colors.isDark ? "#05231a" : "#ffffff",
      fontSize: 14.5,
      fontWeight: "800",
    },
  });
