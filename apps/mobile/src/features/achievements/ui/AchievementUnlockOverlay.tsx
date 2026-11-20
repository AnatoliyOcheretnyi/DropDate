import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import {
  achievementMeta,
  type AchievementListKey,
} from "../model/achievements";
import {
  subscribeAchievementUnlocks,
  type AchievementUnlock,
} from "../model/unlockBus";

const VISIBLE_MS = 4200;
const HIDDEN_Y = -6;
const EXIT_MS = 220;

/**
 * The unlock moment. It is the only place in the app that gets a celebration,
 * with a short fade, one success haptic, then an automatic dismissal.
 */
export function AchievementUnlockOverlay() {
  const [queue, setQueue] = useState<AchievementUnlock[]>([]);
  const [current, setCurrent] = useState<AchievementUnlock | null>(null);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const y = useSharedValue(HIDDEN_Y);
  const opacity = useSharedValue(0);

  useEffect(
    () =>
      subscribeAchievementUnlocks((items) =>
        setQueue((value) => [...value, ...items]),
      ),
    [],
  );

  useEffect(() => {
    if (current || !queue.length) return;
    setCurrent(queue[0]);
    setQueue((value) => value.slice(1));
  }, [current, queue]);

  const dismiss = useCallback(() => {
    y.value = withTiming(HIDDEN_Y, {
      duration: 220,
      reduceMotion: ReduceMotion.System,
    });
    opacity.value = withTiming(0, {
      duration: 200,
      reduceMotion: ReduceMotion.System,
    });
    // Clearing `current` is what lets the queue hand over the next unlock, so
    // it waits for the exit rather than cutting it off.
    setTimeout(() => setCurrent(null), EXIT_MS);
  }, [opacity, y]);

  useEffect(() => {
    if (!current) return;
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => undefined);
    opacity.value = withTiming(1, {
      duration: 160,
      reduceMotion: ReduceMotion.System,
    });
    y.value = withTiming(0, {
      duration: 220,
      reduceMotion: ReduceMotion.System,
    });
    const timer = setTimeout(dismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [current, dismiss, opacity, y]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));
  if (!current) return null;

  const meta = achievementMeta[current.listKey as AchievementListKey] ?? {
    label: "Досягнення",
    icon: "🏆",
  };

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.wrap, { top: insets.top + 8 }, cardStyle]}
    >
      <MotionPressable
        style={styles.toast}
        onPress={dismiss}
        haptic="none"
        accessibilityLabel="Закрити повідомлення про досягнення"
      >
        <View style={styles.badgeWrap}>
          <View style={styles.badge}>
            <Text style={styles.icon}>{meta.icon}</Text>
          </View>
        </View>
        <View style={styles.grow}>
          <Text style={styles.kicker}>НОВИЙ РІВЕНЬ</Text>
          <Text style={styles.title} numberOfLines={1}>
            {meta.label}
          </Text>
          <Text style={styles.tier}>{current.tier} у списку</Text>
        </View>
        <MotionPressable
          style={styles.link}
          onPress={() => {
            dismiss();
            router.push("/achievements" as Href);
          }}
        >
          <Text style={styles.linkText}>Прогрес</Text>
        </MotionPressable>
      </MotionPressable>
    </Animated.View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: {
      position: "absolute",
      zIndex: 1000,
      left: 16,
      right: 16,
    },
    toast: {
      minHeight: 82,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.gold,
      backgroundColor: c.elevated,
      // The burst has to be able to leave the badge circle.
      overflow: "visible",
    },
    badgeWrap: {
      width: 52,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
    },
    badge: {
      width: 46,
      height: 46,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: c.border,
    },
    icon: { fontSize: 24 },
    grow: { flex: 1 },
    kicker: {
      color: c.gold,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.4,
    },
    title: { color: c.text, fontSize: 16, fontWeight: "900", marginTop: 3 },
    tier: { color: c.textMuted, fontSize: 12.5, fontWeight: "700" },
    link: { minHeight: 42, justifyContent: "center", paddingHorizontal: 10 },
    linkText: { color: c.accent, fontWeight: "900" },
  });
