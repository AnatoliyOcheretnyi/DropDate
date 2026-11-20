import { useEffect, useMemo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "../theme/ThemeProvider";

type Props = {
  /** 0…1. Values outside the range are clamped. */
  value: number;
  height?: number;
  color?: string;
  trackColor?: string;
  /** Staggers the fill when several bars enter together. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * A short transition makes progress changes easy to follow. Progress is the
 * one place in the app where the animation carries meaning: seeing the fill
 * move is what tells you the last action counted.
 */
export function AnimatedProgress({
  value,
  height = 7,
  color,
  trackColor,
  delay = 0,
  style,
  accessibilityLabel,
}: Props) {
  const { colors } = useTheme();
  const target = Math.min(Math.max(value, 0), 1);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(target, {
        duration: 360,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [delay, progress, target]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        track: {
          height,
          borderRadius: 99,
          overflow: "hidden",
          backgroundColor: trackColor ?? colors.border,
        },
        fill: {
          height: "100%",
          width: "100%",
          borderRadius: 99,
          backgroundColor: color ?? colors.accent,
          // Scale is cheaper than an animated width, but it has to grow from
          // the left edge rather than the centre.
          transformOrigin: "left",
        },
      }),
    [color, colors.accent, colors.border, height, trackColor],
  );

  return (
    <View
      style={[styles.track, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(target * 100) }}
    >
      <Animated.View style={[styles.fill, fillStyle]} />
    </View>
  );
}
