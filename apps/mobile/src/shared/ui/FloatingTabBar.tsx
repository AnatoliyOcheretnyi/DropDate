import { useEffect, useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
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

const RAISED_ROUTE = "discover";

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

  const raisedIndex = state.routes.findIndex(
    (route) => route.name === RAISED_ROUTE,
  );
  const raisedRoute = raisedIndex >= 0 ? state.routes[raisedIndex] : undefined;
  const raisedDescriptor = raisedRoute
    ? descriptors[raisedRoute.key]
    : undefined;
  const raisedFocused = state.index === raisedIndex;

  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}
      pointerEvents="box-none"
    >
      <View style={styles.barArea}>
        <View style={styles.bar}>
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={colors.isDark ? 32 : 46}
              tint={colors.isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <View style={styles.barTint} />

          {state.routes.map((route, index) => {
            if (index === raisedIndex) {
              return <View key={route.key} style={styles.centerSpacer} />;
            }
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

        {raisedRoute && raisedDescriptor ? (
          <RaisedButton
            colors={colors}
            styles={styles}
            focused={raisedFocused}
            label={
              (raisedDescriptor.options.title ?? raisedRoute.name) as string
            }
            renderIcon={
              raisedDescriptor.options.tabBarIcon as IconRenderer | undefined
            }
            onPress={() =>
              navigateTo(
                raisedRoute.key,
                raisedRoute.name,
                raisedFocused,
                raisedRoute.params,
              )
            }
          />
        ) : null}
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
    transform: [{ scale: 1 + 0.06 * progress.value }],
  }));
  const highlightStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.6 + 0.4 * progress.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + 0.4 * progress.value,
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
        <Animated.View style={[styles.highlight, highlightStyle]} />
        <Animated.View style={iconStyle}>
          {renderIcon?.({ focused, color, size: 24 })}
        </Animated.View>
        {badge != null ? (
          <View style={styles.badge}>
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

function RaisedButton({
  colors,
  styles,
  focused,
  label,
  renderIcon,
  onPress,
}: {
  colors: Palette;
  styles: ReturnType<typeof makeStyles>;
  focused: boolean;
  label: string;
  renderIcon?: IconRenderer;
  onPress: () => void;
}) {
  const mount = useSharedValue(0);
  const focus = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    mount.value = withSpring(1, {
      damping: 16,
      stiffness: 200,
      reduceMotion: ReduceMotion.System,
    });
  }, [mount]);

  useEffect(() => {
    focus.value = withSpring(focused ? 1 : 0, {
      damping: 20,
      stiffness: 260,
      reduceMotion: ReduceMotion.System,
    });
  }, [focused, focus]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: (0.85 + 0.15 * mount.value) * (1 + 0.04 * focus.value) },
    ],
  }));

  const press = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <View style={styles.raisedWrap} pointerEvents="box-none">
      <MotionPressable
        style={styles.raisedPress}
        onPress={press}
        haptic="none"
        accessibilityLabel={label}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
      >
        <Animated.View style={buttonStyle}>
          <LinearGradient
            colors={colors.accentGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.raisedButton}
          >
            {renderIcon?.({ focused, color: "#04140f", size: 22 })}
          </LinearGradient>
        </Animated.View>
        <Text
          style={[
            styles.raisedLabel,
            { color: focused ? colors.accent : colors.textMuted },
          ]}
        >
          {label}
        </Text>
      </MotionPressable>
    </View>
  );
}

const BAR_HEIGHT = 68;
const FAB_SIZE = 56;
const FAB_LIFT = 20;

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 16,
    },
    barArea: {
      // Taller than the pill so the raised FAB stays inside the touch/layout
      // bounds (never clipped) while the pill is pinned to the bottom.
      height: BAR_HEIGHT + FAB_LIFT,
      justifyContent: "flex-end",
    },
    bar: {
      flexDirection: "row",
      alignItems: "center",
      height: BAR_HEIGHT,
      borderRadius: 24,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor:
        Platform.OS === "android"
          ? colors.isDark
            ? "rgba(20,24,38,0.96)"
            : "rgba(255,255,255,0.97)"
          : colors.isDark
            ? "rgba(16,20,32,0.62)"
            : "rgba(255,255,255,0.7)",
      shadowColor: colors.isDark ? "#000000" : colors.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: colors.isDark ? 0.45 : 0.18,
      shadowRadius: 20,
      elevation: 16,
    },
    barTint: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.isDark
        ? "rgba(10,12,24,0.3)"
        : "rgba(255,255,255,0.2)",
    },
    slot: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
      height: "100%",
    },
    centerSpacer: {
      flex: 1,
    },
    iconWrap: {
      width: 44,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
    },
    highlight: {
      position: "absolute",
      width: 44,
      height: 30,
      borderRadius: 12,
      backgroundColor: colors.accentSoft,
    },
    label: {
      fontSize: 11.5,
      fontWeight: "700",
    },
    badge: {
      position: "absolute",
      top: -4,
      right: 2,
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
    // Raised FAB — absolute sibling above the (clipped) pill, centered on the middle slot.
    raisedWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      alignItems: "center",
    },
    raisedPress: {
      borderRadius: 20,
      alignItems: "center",
      gap: 3,
    },
    raisedButton: {
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: colors.background,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.35,
      shadowRadius: 9,
      elevation: 10,
    },
    raisedLabel: {
      fontSize: 11.5,
      lineHeight: 14,
      fontWeight: "800",
    },
  });
