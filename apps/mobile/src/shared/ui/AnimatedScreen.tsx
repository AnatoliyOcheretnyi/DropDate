import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
  ReduceMotion,
} from "react-native-reanimated";

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
}: {
  children: ReactNode;
  index?: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 6) * 55)
        .duration(360)
        .springify()
        .damping(18)
        .reduceMotion(ReduceMotion.System)}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
