import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../../shared/theme/palette";
import { MotionPressable } from "../../../../shared/ui/MotionPressable";

type Props = {
  emoji: string;
  title: string;
  description: string;
  /** Two posters from the player's own library; empty falls back to the tint. */
  posters: string[];
  /** The game's colour; fades into the screen so the copy stays legible. */
  tint: string;
  /** "Рекорд 8/10" or a nudge for a game never played. */
  meta?: string;
  onPress: () => void;
};

/**
 * A game card is mostly image now: posters from the library under a tinted
 * gradient, instead of an emoji on a flat row.
 */
export function GameHubCard({
  emoji,
  title,
  description,
  posters,
  tint,
  meta,
  onPress,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <MotionPressable
      style={styles.card}
      onPress={onPress}
      accessibilityLabel={`${title}. ${description}`}
    >
      <View style={styles.mosaic} pointerEvents="none">
        {[0, 1].map((slot) => (
          <View key={slot} style={styles.slot}>
            {posters[slot] ? (
              <Image
                source={{ uri: posters[slot] }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={180}
              />
            ) : null}
          </View>
        ))}
      </View>

      <LinearGradient
        colors={[tint, colors.background]}
        locations={[0, 0.62]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.tint}
        pointerEvents="none"
      />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>

      <Ionicons
        name="chevron-forward"
        color={colors.accent}
        size={20}
        style={styles.chevron}
      />
    </MotionPressable>
  );
}

const MOSAIC_WIDTH = 92;

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      minHeight: 120,
      paddingVertical: 16,
      borderRadius: 18,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      flexDirection: "row",
      alignItems: "center",
    },
    mosaic: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: MOSAIC_WIDTH,
      flexDirection: "row",
      gap: 8,
    },
    slot: {
      flex: 1,
      overflow: "hidden",
      backgroundColor: colors.elevated,
    },
    tint: {
      ...StyleSheet.absoluteFillObject,
    },
    body: {
      flex: 1,
      paddingLeft: MOSAIC_WIDTH + 12,
      paddingRight: 8,
      gap: 8,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    emoji: { fontSize: 15 },
    title: {
      flexShrink: 1,
      color: colors.text,
      fontSize: 15.5,
      fontWeight: "600",
    },
    description: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 16,
    },
    meta: {
      color: colors.accent,
      fontSize: 11.5,
      fontWeight: "700",
    },
    chevron: {
      marginRight: 12,
    },
  });
