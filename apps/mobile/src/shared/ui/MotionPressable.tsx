import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
  haptic?: 'selection' | 'success' | 'error' | 'none';
};

export function MotionPressable({ children, onPress, style, disabled, accessibilityLabel, haptic = 'selection' }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const press = () => {
    if (haptic === 'selection') void Haptics.selectionAsync();
    if (haptic === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (haptic === 'error') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    onPress?.();
  };
  return <AnimatedPressable
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    disabled={disabled}
    onPressIn={() => { scale.value = withSpring(0.97, { damping: 18, stiffness: 260 }); }}
    onPressOut={() => { scale.value = withSpring(1, { damping: 16, stiffness: 220 }); }}
    onPress={press}
    style={[styles.base, style, animatedStyle, disabled && styles.disabled]}
  >{children}</AnimatedPressable>;
}

const styles = StyleSheet.create({ base: { overflow: 'hidden' }, disabled: { opacity: 0.5 } });
