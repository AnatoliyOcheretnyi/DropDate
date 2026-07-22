import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../../shared/theme/palette";
import { MotionPressable } from "../../../../shared/ui/MotionPressable";

const MOODS = [
  { id: "calm", emoji: "😌", label: "Спокій" },
  { id: "laugh", emoji: "😂", label: "Посміятись" },
  { id: "adrenaline", emoji: "😱", label: "Адреналін" },
  { id: "cry", emoji: "💔", label: "Поплакати" },
  { id: "mind", emoji: "🤯", label: "Розрив мозку" },
];

export function HomeMoodTeaser() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <LinearGradient
      colors={
        colors.isDark
          ? ["rgba(124,92,255,0.22)", "rgba(84,255,182,0.12)"]
          : ["rgba(124,92,255,0.14)", "rgba(0,182,115,0.1)"]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.shell}
    >
      <Text style={styles.kicker}>Один настрій — одна добірка</Text>
      <Text style={styles.heading}>Який у тебе сьогодні вайб?</Text>
      <Text style={styles.lead}>
        Обери настрій — і ми підберемо, що подивитись саме зараз.
      </Text>
      <View style={styles.options}>
        {MOODS.map((mood) => (
          <MotionPressable
            key={mood.id}
            style={styles.chip}
            onPress={() => router.push("/mood")}
            accessibilityLabel={mood.label}
          >
            <Text style={styles.emoji}>{mood.emoji}</Text>
            <Text style={styles.chipText}>{mood.label}</Text>
          </MotionPressable>
        ))}
      </View>
    </LinearGradient>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    shell: {
      borderRadius: 26,
      padding: 22,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    kicker: {
      textTransform: "uppercase",
      letterSpacing: 2,
      color: colors.accent,
      fontSize: 12,
      fontWeight: "800",
    },
    heading: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "900",
    },
    lead: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 8,
    },
    options: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: colors.isDark
        ? "rgba(255,255,255,0.08)"
        : "rgba(255,255,255,0.7)",
      borderWidth: 1,
      borderColor: colors.border,
    },
    emoji: {
      fontSize: 16,
    },
    chipText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
    },
  });
