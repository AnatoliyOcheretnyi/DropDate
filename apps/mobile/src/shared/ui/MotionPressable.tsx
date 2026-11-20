import type { ReactNode } from "react";
import type {
  AccessibilityRole,
  AccessibilityState,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  haptic?: "selection" | "success" | "error" | "none";
};

export function MotionPressable({
  children,
  onPress,
  onLongPress,
  style,
  disabled,
  accessibilityLabel,
  accessibilityRole = "button",
  accessibilityState,
  haptic = "selection",
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const press = () => {
    if (haptic === "selection")
      void Haptics.selectionAsync().catch(() => undefined);
    if (haptic === "success")
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => undefined);
    if (haptic === "error")
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      ).catch(() => undefined);
    onPress?.();
  };
  const longPress = onLongPress
    ? () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
          () => undefined,
        );
        onLongPress();
      }
    : undefined;
  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{
        ...accessibilityState,
        disabled: Boolean(disabled),
      }}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withTiming(0.985, {
          duration: 110,
          reduceMotion: ReduceMotion.System,
        });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, {
          duration: 170,
          reduceMotion: ReduceMotion.System,
        });
      }}
      onPress={press}
      onLongPress={longPress}
      style={[styles.base, style, animatedStyle, disabled && styles.disabled]}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { overflow: "hidden" },
  disabled: { opacity: 0.5 },
});
