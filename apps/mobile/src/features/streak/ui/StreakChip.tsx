import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
import { useStreak } from "../hooks/useStreak";

/**
 * The streak at header size. It only appears once there is a streak to lose —
 * a permanent "0" would be a scold on every screen.
 */
export function StreakChip() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { streak, isTodayDone } = useStreak();

  if (streak <= 0) return null;

  return (
    <View
      style={[styles.chip, !isTodayDone && styles.pending]}
      accessible
      accessibilityLabel={`Серія: ${streak} днів${isTodayDone ? "" : ", сьогодні ще не зараховано"}`}
    >
      <Ionicons
        name="flame"
        size={13}
        color={isTodayDone ? colors.gold : colors.textMuted}
      />
      <Text style={[styles.text, !isTodayDone && styles.textPending]}>
        {streak}
      </Text>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.gold,
      backgroundColor: colors.isDark
        ? "rgba(255,196,107,0.12)"
        : "rgba(178,122,22,0.1)",
    },
    pending: { borderColor: colors.border, backgroundColor: colors.elevated },
    text: { color: colors.gold, fontSize: 12.5, fontWeight: "900" },
    textPending: { color: colors.textMuted },
  });
