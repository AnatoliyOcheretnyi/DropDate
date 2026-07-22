import { useEffect, useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  ReduceMotion,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useTheme } from "../theme/ThemeProvider";
import type { Palette } from "../theme/palette";
import { MotionPressable } from "./MotionPressable";

type IconRenderer = (props: {
  focused: boolean;
  color: string;
  size: number;
}) => React.ReactNode;

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const navigateTo = (
    routeKey: string,
    routeName: string,
    focused: boolean,
    params?: object,
  ) => {
    void Haptics.selectionAsync();
    const event = navigation.emit({
      type: "tabPress",
      target: routeKey,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(routeName, params);
    }
  };

  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={colors.isDark ? 34 : 48}
            tint={colors.isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View style={styles.barTint} />

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = (options.title ?? route.name) as string;
          const focused = state.index === index;
          return (
            <TabItem
              key={route.key}
              label={label}
              focused={focused}
              colors={colors}
              styles={styles}
              badge={options.tabBarBadge}
              renderIcon={options.tabBarIcon as IconRenderer | undefined}
              onPress={() =>
                navigateTo(route.key, route.name, focused, route.params)
              }
            />
          );
        })}
      </View>
    </View>
  );
}

function TabItem({
  label,
  focused,
  colors,
  styles,
  badge,
  renderIcon,
  onPress,
}: {
  label: string;
  focused: boolean;
  colors: Palette;
  styles: ReturnType<typeof makeStyles>;
  badge?: number | string;
  renderIcon?: IconRenderer;
  onPress: () => void;
}) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, {
      damping: 20,
      stiffness: 260,
      mass: 0.55,
      reduceMotion: ReduceMotion.System,
    });
  }, [focused, progress]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -2 * progress.value }],
  }));
  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.7 + 0.3 * progress.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + 0.45 * progress.value,
  }));

  const color = focused ? colors.accent : colors.textMuted;

  return (
    <MotionPressable
      style={styles.slot}
      onPress={onPress}
      haptic="none"
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
    >
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.pill, pillStyle]} />
        <Animated.View style={iconStyle}>
          {renderIcon?.({ focused, color, size: 24 })}
        </Animated.View>
        {badge != null ? (
          <View style={styles.badge} pointerEvents="none">
            <Text style={styles.badgeText}>
              {typeof badge === "number" && badge > 99 ? "99+" : badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Animated.Text
        style={[styles.label, { color }, labelStyle]}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>
    </MotionPressable>
  );
}

const BAR_HEIGHT = 64;

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 16,
    },
    bar: {
      flexDirection: "row",
      alignItems: "center",
      height: BAR_HEIGHT,
      borderRadius: 26,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      // A single, opaque-enough surface: the blur reads on iOS, while Android
      // (no blur) still gets a solid pill. No extra stacked tint/shadow noise.
      backgroundColor:
        Platform.OS === "android"
          ? colors.isDark
            ? "rgba(20,24,38,0.98)"
            : "rgba(255,255,255,0.98)"
          : colors.isDark
            ? "rgba(16,20,32,0.6)"
            : "rgba(255,255,255,0.72)",
      shadowColor: colors.isDark ? "#000000" : colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: colors.isDark ? 0.35 : 0.14,
      shadowRadius: 16,
      elevation: 12,
    },
    barTint: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.isDark
        ? "rgba(10,12,24,0.22)"
        : "rgba(255,255,255,0.16)",
    },
    slot: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      height: "100%",
    },
    iconWrap: {
      width: 48,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
    },
    pill: {
      position: "absolute",
      width: 48,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.accentSoft,
    },
    label: {
      fontSize: 11,
      fontWeight: "700",
    },
    badge: {
      position: "absolute",
      top: -4,
      right: 4,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 5,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
      borderWidth: 1.5,
      borderColor: colors.background,
    },
    badgeText: {
      color: colors.isDark ? "#04140f" : "#ffffff",
      fontSize: 11,
      fontWeight: "800",
    },
  });
