import { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../theme/ThemeProvider";
import type { Palette } from "../theme/palette";
import { copy } from "../strings";
import type { Suggestion } from "../types/release";
import { CountdownPill } from "./CountdownPill";
import { MotionPressable } from "./MotionPressable";

/** Neutral dark placeholder so posters fade in instead of popping in. */
const POSTER_BLURHASH = "L03[?wxu00WB00j[00j[00WB00j[";

type Props = {
  item: Suggestion;
  onPress: (item: Suggestion) => void;
  onAdd?: (item: Suggestion) => void;
  onLongPress?: (item: Suggestion) => void;
  isSaved?: boolean;
  size?: { width: number; height: number };
  /** ISO date of the next release; renders a countdown over the artwork. */
  releaseDate?: string;
};

function PosterCardComponent({
  item,
  onPress,
  onAdd,
  onLongPress,
  isSaved = false,
  size,
  releaseDate,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handleAdd = () => {
    void Haptics.selectionAsync();
    onAdd?.(item);
  };

  return (
    <MotionPressable
      style={[
        styles.card,
        size ? { width: size.width, height: size.height } : null,
      ]}
      onPress={() => onPress(item)}
      onLongPress={onLongPress ? () => onLongPress(item) : undefined}
      accessibilityLabel={item.title}
      haptic="none"
    >
      {item.posterUrl ? (
        <Image
          source={{ uri: item.posterUrl }}
          style={styles.image}
          contentFit="cover"
          transition={220}
          cachePolicy="memory-disk"
          placeholder={{ blurhash: POSTER_BLURHASH }}
          placeholderContentFit="cover"
          recyclingKey={`${item.mediaType}-${item.id}`}
        />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>{item.title.slice(0, 1)}</Text>
        </View>
      )}
      <LinearGradient
        colors={["transparent", "rgba(4,6,14,0.55)"]}
        style={styles.scrim}
        pointerEvents="none"
      />
      {isSaved ? (
        <View style={styles.savedBadge}>
          <Ionicons name="checkmark" size={12} color={colors.text} />
          <Text style={styles.savedText}>{copy.actions.added}</Text>
        </View>
      ) : releaseDate ? (
        // The countdown takes the badge's corner rather than crowding it:
        // only one of "saved" and "lands in 3 days" fits, and on a card that
        // carries a date the date is the more useful half.
        <CountdownPill
          date={releaseDate}
          size="sm"
          hidePast
          style={styles.countdown}
        />
      ) : null}
      {!isSaved && onAdd ? (
        <Pressable
          style={styles.addButton}
          onPress={handleAdd}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Додати «${item.title}» у список`}
        >
          <Text style={styles.addText}>+</Text>
        </Pressable>
      ) : null}
    </MotionPressable>
  );
}

export const PosterCard = memo(PosterCardComponent);

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      width: 120,
      height: 180,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    image: {
      width: "100%",
      height: "100%",
    },
    scrim: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "45%",
    },
    fallback: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
    },
    fallbackText: {
      color: colors.text,
      fontSize: 28,
      fontWeight: "700",
    },
    addButton: {
      position: "absolute",
      right: 10,
      bottom: 10,
      width: 34,
      height: 34,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.55)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.4)",
    },
    addText: {
      color: "#ffffff",
      fontSize: 20,
      fontWeight: "700",
      lineHeight: 22,
    },
    countdown: {
      position: "absolute",
      left: 8,
      bottom: 8,
      maxWidth: "88%",
    },
    savedBadge: {
      position: "absolute",
      left: 10,
      bottom: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      // A state, not a button — the accent stays with things you can press.
      backgroundColor: colors.isDark
        ? "rgba(11,15,20,0.72)"
        : "rgba(255,255,255,0.92)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    savedText: {
      color: colors.text,
      fontSize: 11.5,
      fontWeight: "700",
    },
  });
