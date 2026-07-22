import { useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  useWindowDimensions,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "../theme/ThemeProvider";

type ShimmerProps = {
  width: DimensionValue;
  height: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

const SWEEP_WIDTH = 160;

/**
 * A sweeping highlight rather than an opacity pulse — the sweep reads as
 * "loading", a pulse reads as "something is wrong with this element".
 */
export function Shimmer({ width, height, radius = 14, style }: ShimmerProps) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(-1);

  useEffect(() => {
    if (reducedMotion) return;
    progress.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
  }, [progress, reducedMotion]);

  // Travel across the widest this box can plausibly be, so percentage widths
  // (which we cannot measure here) still get a full sweep.
  const travel = typeof width === "number" ? width : screenWidth;

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.value * (travel + SWEEP_WIDTH) - SWEEP_WIDTH / 2 },
    ],
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.elevated,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {reducedMotion ? null : (
        <Animated.View style={[styles.sweep, sweepStyle]}>
          <LinearGradient
            colors={[
              "transparent",
              colors.isDark
                ? "rgba(255,255,255,0.09)"
                : "rgba(255,255,255,0.6)",
              "transparent",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

export function PosterRowSkeleton({ count = 4 }: { count?: number }) {
  const items = useMemo(
    () => Array.from({ length: count }, (_, i) => i),
    [count],
  );
  return (
    <View style={styles.row}>
      {items.map((i) => (
        <Shimmer key={i} width={120} height={180} radius={18} />
      ))}
    </View>
  );
}

/**
 * Mirrors the real spotlight block. Without it the header collapsed to zero
 * height while loading and the whole feed jumped once data landed.
 */
export function SpotlightSkeleton({ heroHeight }: { heroHeight: number }) {
  const { width } = useWindowDimensions();
  const supportWidth = (width - 40 - 24) / 3;
  return (
    <View style={styles.spotlight}>
      <Shimmer width="100%" height={heroHeight} radius={26} />
      <View style={styles.supportRow}>
        {[0, 1, 2].map((i) => (
          <Shimmer
            key={i}
            width={supportWidth}
            height={supportWidth * 1.5}
            radius={18}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 14,
  },
  sweep: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: SWEEP_WIDTH,
  },
  spotlight: { gap: 16 },
  supportRow: { flexDirection: "row", gap: 12 },
});
