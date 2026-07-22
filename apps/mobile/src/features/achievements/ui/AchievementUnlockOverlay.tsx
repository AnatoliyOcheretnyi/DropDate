import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
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
export function AchievementUnlockOverlay() {
  const [queue, setQueue] = useState<AchievementUnlock[]>([]);
  const [current, setCurrent] = useState<AchievementUnlock | null>(null);
  const y = useRef(new Animated.Value(-130)).current;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
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
  useEffect(() => {
    if (!current) return;
    Animated.spring(y, { toValue: 0, useNativeDriver: true }).start();
    const timer = setTimeout(
      () =>
        Animated.timing(y, {
          toValue: -130,
          duration: 220,
          useNativeDriver: true,
        }).start(() => setCurrent(null)),
      4200,
    );
    return () => clearTimeout(timer);
  }, [current, y]);
  if (!current) return null;
  const meta = achievementMeta[current.listKey as AchievementListKey] ?? {
    label: "Досягнення",
    icon: "🏆",
  };
  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { transform: [{ translateY: y }] }]}
    >
      <Text style={styles.icon}>{meta.icon}</Text>
      <View style={styles.grow}>
        <Text style={styles.kicker}>НОВИЙ РІВЕНЬ</Text>
        <Text style={styles.title}>
          {meta.label} · {current.tier}
        </Text>
      </View>
      <MotionPressable
        style={styles.link}
        onPress={() => {
          setCurrent(null);
          router.push("/achievements" as Href);
        }}
      >
        <Text style={styles.linkText}>Прогрес</Text>
      </MotionPressable>
    </Animated.View>
  );
}
const makeStyles = (c: Palette) =>
  StyleSheet.create({
    toast: {
      position: "absolute",
      zIndex: 1000,
      top: 54,
      left: 16,
      right: 16,
      minHeight: 78,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.accent,
      backgroundColor: c.elevated,
    },
    icon: { fontSize: 30 },
    grow: { flex: 1 },
    kicker: {
      color: c.accent,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.4,
    },
    title: { color: c.text, fontSize: 16, fontWeight: "900", marginTop: 3 },
    link: { minHeight: 42, justifyContent: "center", paddingHorizontal: 10 },
    linkText: { color: c.accent, fontWeight: "900" },
  });
