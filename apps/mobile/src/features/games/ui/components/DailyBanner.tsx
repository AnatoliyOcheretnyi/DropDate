import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../../shared/theme/palette";
import { MotionPressable } from "../../../../shared/ui/MotionPressable";

type Props = {
  label: string;
  dateLabel: string;
  /** A backdrop or poster from the library; the banner works without it too. */
  image?: string;
  onPress: () => void;
};

/**
 * The daily challenge, promoted from a text row to the one full-width image on
 * the hub — the same move the web redesign makes.
 */
export function DailyBanner({ label, dateLabel, image, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <MotionPressable
      style={styles.card}
      onPress={onPress}
      accessibilityLabel={`Щоденний виклик: ${label}`}
    >
      {image ? (
        <Image
          source={{ uri: image }}
          style={styles.media}
          contentFit="cover"
          transition={200}
        />
      ) : null}
      <LinearGradient
        colors={[
          colors.isDark ? "rgba(10,12,24,0.25)" : "rgba(244,246,251,0.3)",
          colors.background,
        ]}
        locations={[0, 0.86]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.body}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>ЩОДЕННИЙ ВИКЛИК</Text>
        </View>
        <Text style={styles.title}>
          {label} · {dateLabel}
        </Text>
        <Text style={styles.copy}>Однакові питання для всіх. Нове щодня.</Text>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>Грати →</Text>
        </View>
      </View>
    </MotionPressable>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      borderRadius: 22,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      minHeight: 210,
      justifyContent: "flex-end",
    },
    media: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      height: 130,
    },
    body: {
      padding: 16,
      gap: 8,
      alignItems: "flex-start",
    },
    badge: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.accentSoft,
    },
    badgeText: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.1,
    },
    title: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "900",
    },
    copy: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    cta: {
      marginTop: 4,
      paddingHorizontal: 18,
      paddingVertical: 11,
      borderRadius: 12,
      backgroundColor: colors.accent,
    },
    ctaText: {
      color: colors.isDark ? "#04140f" : "#ffffff",
      fontSize: 13,
      fontWeight: "800",
    },
  });
