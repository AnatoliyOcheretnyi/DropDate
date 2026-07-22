import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../theme/ThemeProvider";
import type { Palette, ThemeMode } from "../theme/palette";
import { MotionPressable } from "./MotionPressable";

const OPTIONS: {
  mode: ThemeMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { mode: "system", label: "Системна", icon: "phone-portrait-outline" },
  { mode: "light", label: "Світла", icon: "sunny-outline" },
  { mode: "dark", label: "Темна", icon: "moon-outline" },
];

export function ThemeToggle() {
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Тема</Text>
      <View style={styles.segment}>
        {OPTIONS.map((option) => {
          const active = mode === option.mode;
          return (
            <MotionPressable
              key={option.mode}
              style={[styles.item, active && styles.itemActive]}
              onPress={() => setMode(option.mode)}
              accessibilityLabel={option.label}
            >
              <Ionicons
                name={option.icon}
                size={17}
                color={
                  active
                    ? colors.isDark
                      ? "#04140f"
                      : "#ffffff"
                    : colors.textMuted
                }
              />
              <Text style={[styles.itemText, active && styles.itemTextActive]}>
                {option.label}
              </Text>
            </MotionPressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: {
      gap: 10,
    },
    label: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    segment: {
      flexDirection: "row",
      gap: 6,
      padding: 5,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    item: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 12,
    },
    itemActive: {
      backgroundColor: colors.accent,
    },
    itemText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "700",
    },
    itemTextActive: {
      color: colors.isDark ? "#04140f" : "#ffffff",
    },
  });
