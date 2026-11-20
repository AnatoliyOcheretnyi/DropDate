import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "../theme/ThemeProvider";

const PARTICLE_COUNT = 14;
const SPREAD = 74;

type Particle = {
  x: number;
  y: number;
  size: number;
  delay: number;
  color: string;
};

/**
 * A one-shot burst behind an unlock. Plain views on the UI thread rather than
 * a Lottie dependency: fourteen dots is all the moment needs, and it keeps the
 * bundle honest.
 */
export function Celebration({ trigger }: { trigger: unknown }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();

  const particles = useMemo<Particle[]>(() => {
    const palette = [colors.accent, colors.gold, colors.accentDark];
    return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
      const angle = (index / PARTICLE_COUNT) * Math.PI * 2;
      const distance = SPREAD * (0.6 + ((index * 37) % 40) / 100);
      return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance * 0.8,
        size: 5 + (index % 3) * 2,
        delay: (index % 5) * 26,
        color: palette[index % palette.length],
      };
    });
  }, [colors.accent, colors.accentDark, colors.gold]);

  if (reduceMotion) return null;

  return (
    <View style={styles.root} pointerEvents="none">
      {particles.map((particle, index) => (
        <Spark key={index} particle={particle} trigger={trigger} />
      ))}
    </View>
  );
}

function Spark({
  particle,
  trigger,
}: {
  particle: Particle;
  trigger: unknown;
}) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // A second unlock replays the burst from the centre rather than leaving
    // the first one's dots where they landed.
    progress.value = 0;
    opacity.value = 1;
    progress.value = withDelay(
      particle.delay,
      withSpring(1, {
        damping: 13,
        stiffness: 110,
        reduceMotion: ReduceMotion.System,
      }),
    );
    opacity.value = withDelay(
      particle.delay + 260,
      withTiming(0, { duration: 520, reduceMotion: ReduceMotion.System }),
    );
  }, [opacity, particle.delay, progress, trigger]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: particle.x * progress.value },
      { translateY: particle.y * progress.value },
      { scale: 0.4 + progress.value * 0.6 },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
        },
        styles.spark,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  spark: { position: "absolute" },
});
