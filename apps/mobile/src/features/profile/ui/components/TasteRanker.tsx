import { memo, useCallback, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  LinearTransition,
  ReduceMotion,
} from "react-native-reanimated";

import { AnimatedProgress } from "../../../../shared/ui/AnimatedProgress";
import { MotionPressable } from "../../../../shared/ui/MotionPressable";
import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../../shared/theme/palette";
import type { TasteKind } from "../../store/tasteStore";

type Props = {
  title: string;
  kind: TasteKind;
  items: string[];
  onMove: (kind: TasteKind, index: number, delta: number) => void;
  onReset: (kind: TasteKind) => void;
};

export const TasteRanker = memo(function TasteRanker({
  title,
  kind,
  items,
  onMove,
  onReset,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const handleReset = useCallback(() => onReset(kind), [kind, onReset]);

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        <MotionPressable onPress={handleReset} accessibilityLabel="Скинути">
          <Text style={styles.reset}>Скинути</Text>
        </MotionPressable>
      </View>
      {items.map((item, index) => (
        <Row
          key={item}
          label={item}
          index={index}
          total={items.length}
          kind={kind}
          onMove={onMove}
          styles={styles}
          arrowColor={colors.text}
        />
      ))}
    </View>
  );
});

/**
 * A row of its own so the two arrows keep stable handlers: an inline
 * `() => onMove(...)` in the parent hands every row a new function on every
 * render, which is what made a list of twelve genres re-mount its animated
 * pressables on each reorder.
 */
const Row = memo(function Row({
  label,
  index,
  total,
  kind,
  onMove,
  styles,
  arrowColor,
}: {
  label: string;
  index: number;
  total: number;
  kind: TasteKind;
  onMove: (kind: TasteKind, index: number, delta: number) => void;
  styles: ReturnType<typeof makeStyles>;
  arrowColor: string;
}) {
  const moveUp = useCallback(
    () => onMove(kind, index, -1),
    [index, kind, onMove],
  );
  const moveDown = useCallback(
    () => onMove(kind, index, 1),
    [index, kind, onMove],
  );
  const weight = (total - index) / total;

  return (
    // Keep a short transition so rank changes remain easy to follow.
    <Animated.View
      style={styles.row}
      layout={LinearTransition.duration(220).reduceMotion(ReduceMotion.System)}
    >
      <Text style={styles.rank}>{index + 1}</Text>
      <View style={styles.grow}>
        <Text style={styles.name}>{label}</Text>
        <AnimatedProgress value={weight} height={3} style={styles.track} />
      </View>
      <MotionPressable
        disabled={index === 0}
        onPress={moveUp}
        style={styles.icon}
        accessibilityLabel={`Підняти ${label}`}
      >
        <Ionicons name="chevron-up" color={arrowColor} size={18} />
      </MotionPressable>
      <MotionPressable
        disabled={index === total - 1}
        onPress={moveDown}
        style={styles.icon}
        accessibilityLabel={`Опустити ${label}`}
      >
        <Ionicons name="chevron-down" color={arrowColor} size={18} />
      </MotionPressable>
    </Animated.View>
  );
});

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: {
      gap: 10,
      padding: 16,
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: { color: colors.text, fontSize: 19, fontWeight: "900" },
    reset: { color: colors.accent, fontWeight: "700" },
    row: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10 },
    grow: { flex: 1 },
    rank: { width: 24, color: colors.accent, fontWeight: "900", fontSize: 17 },
    name: { color: colors.text, fontWeight: "700" },
    track: { marginTop: 7 },
    icon: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: colors.card,
    },
  });
