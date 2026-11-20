import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";

import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
import { AnimatedCounter } from "../../../shared/ui/AnimatedCounter";
import { AnimatedProgress } from "../../../shared/ui/AnimatedProgress";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { dayWord } from "../../../shared/utils/countdown";
import { useStreak } from "../hooks/useStreak";
import type { StreakDay } from "../model/streak";

/**
 * The habit surface: how many days in a row you have touched the app, the week
 * behind you, and one goal that is small enough to finish. Everything it shows
 * comes from what you already do — saving a title or marking an episode —
 * so there is no separate score to farm.
 */
export function StreakCard() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const {
    streak,
    best,
    week,
    isTodayDone,
    watchedThisWeek,
    weeklyGoal,
    goalReached,
    freezeUsed,
  } = useStreak();

  const goalLabel = goalReached
    ? "Ціль тижня виконано"
    : `Ще ${weeklyGoal - watchedThisWeek} до цілі тижня`;

  return (
    <MotionPressable
      style={styles.card}
      onPress={() => router.push("/achievements" as Href)}
      accessibilityLabel={`Серія ${streak} ${dayWord(streak)}. ${goalLabel}.`}
      haptic="selection"
    >
      <View style={styles.head}>
        <View
          style={[styles.flame, isTodayDone ? styles.flameOn : styles.flameOff]}
        >
          <Ionicons
            name="flame"
            size={24}
            color={isTodayDone ? colors.gold : colors.textMuted}
          />
        </View>
        <View style={styles.headCopy}>
          <Text style={styles.kicker}>СЕРІЯ ДНІВ</Text>
          <View style={styles.countRow}>
            <AnimatedCounter
              value={streak}
              style={styles.count}
              accessibilityLabel={`${streak}`}
            />
            <Text style={styles.countUnit}>{dayWord(streak)} поспіль</Text>
          </View>
          <Text style={styles.sub}>
            {streak === 0
              ? "Збережи щось сьогодні — і серія почнеться"
              : isTodayDone
                ? `Сьогодні зараховано · рекорд ${best}`
                : "Сьогодні ще не зараховано"}
          </Text>
        </View>
      </View>

      <View style={styles.week}>
        {week.map((day) => (
          <Dot key={day.key} day={day} styles={styles} />
        ))}
      </View>

      <View style={styles.goal}>
        <View style={styles.goalHead}>
          <Text style={styles.goalLabel}>{goalLabel}</Text>
          <Text style={styles.goalCount}>
            {Math.min(watchedThisWeek, weeklyGoal)}/{weeklyGoal}
          </Text>
        </View>
        <AnimatedProgress
          value={watchedThisWeek / weeklyGoal}
          color={goalReached ? colors.gold : colors.accent}
          height={6}
          accessibilityLabel={goalLabel}
        />
      </View>

      {freezeUsed && streak > 0 ? (
        <Text style={styles.freeze}>
          ❄️ Один пропущений день цієї серії вже прощено
        </Text>
      ) : null}
    </MotionPressable>
  );
}

function Dot({
  day,
  styles,
}: {
  day: StreakDay;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.dayColumn}>
      <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
        {day.label}
      </Text>
      <View
        style={[
          styles.dot,
          day.hit && styles.dotHit,
          day.isToday && !day.hit && styles.dotToday,
        ]}
      />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      gap: 16,
      padding: 18,
      borderRadius: 24,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    head: { flexDirection: "row", alignItems: "center", gap: 14 },
    flame: {
      width: 52,
      height: 52,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },
    flameOn: {
      backgroundColor: colors.isDark
        ? "rgba(255,196,107,0.14)"
        : "rgba(178,122,22,0.12)",
      borderColor: colors.gold,
    },
    flameOff: { backgroundColor: colors.elevated, borderColor: colors.border },
    headCopy: { flex: 1, gap: 2 },
    kicker: {
      textTransform: "uppercase",
      letterSpacing: 1.6,
      color: colors.eyebrow,
      fontSize: 10.5,
      fontWeight: "800",
    },
    countRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
    count: { color: colors.text, fontSize: 30, fontWeight: "900" },
    countUnit: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
    sub: { color: colors.textMuted, fontSize: 12.5 },
    week: { flexDirection: "row", justifyContent: "space-between" },
    dayColumn: { alignItems: "center", gap: 7, flex: 1 },
    dayLabel: { color: colors.eyebrow, fontSize: 11, fontWeight: "700" },
    dayLabelToday: { color: colors.text },
    dot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.border,
    },
    dotHit: { backgroundColor: colors.accent },
    // Today, still open: an outline you can visibly fill in.
    dotToday: {
      backgroundColor: "transparent",
      borderWidth: 2,
      borderColor: colors.accent,
    },
    goal: { gap: 8 },
    goalHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    goalLabel: { color: colors.text, fontSize: 13.5, fontWeight: "700" },
    goalCount: { color: colors.textMuted, fontSize: 13, fontWeight: "800" },
    freeze: { color: colors.textMuted, fontSize: 12 },
  });
