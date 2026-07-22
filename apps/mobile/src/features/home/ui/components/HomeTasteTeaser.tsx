import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../../shared/theme/palette";
import { MotionPressable } from "../../../../shared/ui/MotionPressable";

/**
 * Intentionally a compact row, not a card: the mood teaser further down the
 * feed is already a big gradient panel with emoji chips, and two of those in a
 * row read as the same block repeated.
 */
export function HomeTasteTeaser() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <MotionPressable
      onPress={() => router.push("/browse")}
      accessibilityLabel="Під твій смак: обрати жанр або країну"
      style={styles.row}
    >
      <View style={styles.icon}>
        <Ionicons name="color-filter" size={20} color={colors.accent} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Обери жанр чи країну</Text>
        <Text style={styles.lead} numberOfLines={1}>
          Зберемо добірку під твій смак
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </MotionPressable>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      minHeight: 68,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    icon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accentSoft,
    },
    copy: { flex: 1, gap: 2 },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
    lead: {
      color: colors.textMuted,
      fontSize: 13.5,
    },
  });
