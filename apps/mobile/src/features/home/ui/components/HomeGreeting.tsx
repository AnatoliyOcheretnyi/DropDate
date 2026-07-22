import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../../shared/theme/palette";
import { copy } from "../../../../shared/strings";
import { MotionPressable } from "../../../../shared/ui/MotionPressable";

const greeting = (hour: number) => {
  if (hour < 5) return "Доброї ночі";
  if (hour < 12) return "Доброго ранку";
  if (hour < 18) return "Доброго дня";
  return "Доброго вечора";
};

export function HomeGreeting({
  name,
  onSearch,
}: {
  name?: string;
  onSearch: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const hello = useMemo(() => greeting(new Date().getHours()), []);

  return (
    <View style={styles.wrap}>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{name ? `${hello}, ${name}` : hello}</Text>
        <Text style={styles.title} accessibilityRole="header">
          Нові релізи
        </Text>
      </View>

      <MotionPressable
        style={styles.searchPill}
        onPress={onSearch}
        accessibilityLabel={copy.header.searchOpenLabel}
      >
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <Text style={styles.searchText}>{copy.header.searchPlaceholder}</Text>
      </MotionPressable>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: { gap: 14 },
    copy: { gap: 4 },
    eyebrow: {
      textTransform: "uppercase",
      letterSpacing: 3,
      color: colors.accent,
      fontSize: 12,
      fontWeight: "800",
    },
    title: {
      fontSize: 32,
      fontWeight: "900",
      color: colors.text,
    },
    searchPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
      height: 50,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchText: {
      color: colors.textMuted,
      fontSize: 15,
    },
  });
