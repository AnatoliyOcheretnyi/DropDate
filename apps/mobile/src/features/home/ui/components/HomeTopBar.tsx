import { useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../../shared/theme/palette";
import { NotificationBell } from "../../../../shared/ui/NotificationBell";

const BAR_HEIGHT = 52;
/** Scroll distance over which the bar goes from invisible to fully opaque. */
const FADE_START = 40;
const FADE_END = 130;

/**
 * A backdrop that fades in under the notification bell once the feed scrolls,
 * so the bell never floats unreadable over poster art. Deliberately has no
 * title: the screen's own heading sits right below it and repeating it here
 * would be chrome for its own sake.
 */
export function HomeTopBar({ scrollY }: { scrollY: SharedValue<number> }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const surfaceStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [FADE_START, FADE_END],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View
      style={[styles.root, { height: insets.top + BAR_HEIGHT }]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, surfaceStyle]}
        pointerEvents="none"
      >
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={40}
            tint={colors.isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidSurface]} />
        )}
        <View style={styles.hairline} />
      </Animated.View>

      <View style={[styles.row, { marginTop: insets.top }]}>
        <NotificationBell floating={false} />
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
    },
    androidSurface: {
      backgroundColor: colors.background,
      opacity: 0.94,
    },
    hairline: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    row: {
      height: BAR_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      paddingHorizontal: 20,
    },
  });

export const HOME_TOP_BAR_HEIGHT = BAR_HEIGHT;
