import type { ReactNode } from 'react';
import type { AccessibilityRole, AccessibilityState, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

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
  haptic?: 'selection' | 'success' | 'error' | 'none';
};

export function MotionPressable({ children, onPress, onLongPress, style, disabled, accessibilityLabel, accessibilityRole = 'button', accessibilityState, haptic = 'selection' }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const press = () => {
    if (haptic === 'selection') void Haptics.selectionAsync();
    if (haptic === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (haptic === 'error') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    onPress?.();
  };
  const longPress = onLongPress
    ? () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLongPress();
      }
    : undefined;
  return <AnimatedPressable
    accessibilityRole={accessibilityRole}
    accessibilityLabel={accessibilityLabel}
    accessibilityState={accessibilityState}
    disabled={disabled}
    onPressIn={() => { scale.value = withSpring(0.97, { damping: 18, stiffness: 260, reduceMotion: ReduceMotion.System }); }}
    onPressOut={() => { scale.value = withSpring(1, { damping: 16, stiffness: 220, reduceMotion: ReduceMotion.System }); }}
    onPress={press}
    onLongPress={longPress}
    style={[styles.base, style, animatedStyle, disabled && styles.disabled]}
  >{children}</AnimatedPressable>;
}

const styles = StyleSheet.create({ base: { overflow: 'hidden' }, disabled: { opacity: 0.5 } });
