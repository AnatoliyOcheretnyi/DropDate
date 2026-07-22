import { useRef, type ReactNode } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
  ReduceMotion,
} from "react-native-reanimated";

/**
 * Entering animations replay every time a virtualised cell is recycled, which
 * makes long lists visibly twitch while scrolling. We therefore only allow the
 * intro to run during the first moments after the list mounts.
 */
const INTRO_WINDOW_MS = 1200;

export function AnimatedScreenContent({ children }: { children: ReactNode }) {
  return (
    <Animated.View
      entering={FadeIn.duration(260).reduceMotion(ReduceMotion.System)}
      layout={LinearTransition.springify()
        .damping(20)
        .reduceMotion(ReduceMotion.System)}
      style={styles.fill}
    >
      {children}
    </Animated.View>
  );
}

export function AnimatedSection({
  children,
  index = 0,
  /**
   * Pass the list's mount timestamp (`useRef(Date.now()).current`) when the
   * section lives inside a recycling list. Cells mounted later than the intro
   * window render without an entering animation.
   */
  mountedAt,
}: {
  children: ReactNode;
  index?: number;
  mountedAt?: number;
}) {
  const ownMount = useRef(Date.now()).current;
  const origin = mountedAt ?? ownMount;
  const isIntro = ownMount - origin < INTRO_WINDOW_MS;

  return (
    <Animated.View
      entering={
        isIntro
          ? FadeInDown.delay(Math.min(index, 6) * 55)
              .duration(360)
              .springify()
              .damping(18)
              .reduceMotion(ReduceMotion.System)
          : undefined
      }
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
