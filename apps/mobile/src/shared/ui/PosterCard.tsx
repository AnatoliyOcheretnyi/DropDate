import { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { useTheme } from "../theme/ThemeProvider";
import type { Palette } from "../theme/palette";
import { copy } from "../strings";
import type { Suggestion } from "../types/release";
import { MotionPressable } from "./MotionPressable";

type Props = {
  item: Suggestion;
  onPress: (item: Suggestion) => void;
  onAdd?: (item: Suggestion) => void;
  onLongPress?: (item: Suggestion) => void;
  isSaved?: boolean;
  size?: { width: number; height: number };
};

function PosterCardComponent({
  item,
  onPress,
  onAdd,
  onLongPress,
  isSaved = false,
  size,
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
          <Text style={styles.savedText}>{copy.actions.added}</Text>
        </View>
      ) : onAdd ? (
        <Pressable style={styles.addButton} onPress={handleAdd} hitSlop={8}>
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
    savedBadge: {
      position: "absolute",
      left: 10,
      bottom: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.accent,
    },
    savedText: {
      color: colors.isDark ? "#04140f" : "#ffffff",
      fontSize: 12,
      fontWeight: "700",
    },
  });
