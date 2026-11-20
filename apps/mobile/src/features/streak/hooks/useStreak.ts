import { useMemo } from "react";

import { useSaved } from "../../saved/hooks/useSaved";
import {
  WEEKLY_GOAL,
  dayKey,
  displayedStreak,
  isStreakAtRisk,
  lastSevenDays,
  startOfWeek,
} from "../model/streak";
import { useStreakStore } from "../model/streakStore";

/**
 * Everything the streak surfaces need, derived in one place: the flame count,
 * the week of dots, and the weekly goal — which is real watch data, not a
 * second counter we would have to keep honest.
 */
export function useStreak() {
  const current = useStreakStore((state) => state.current);
  const best = useStreakStore((state) => state.best);
  const lastDay = useStreakStore((state) => state.lastDay);
  const freezeUsed = useStreakStore((state) => state.freezeUsed);
  const days = useStreakStore((state) => state.days);
  const { saved } = useSaved();

  return useMemo(() => {
    const now = new Date();
    const today = dayKey(now);
    const snapshot = { current, best, lastDay, freezeUsed, days };
    const weekStart = startOfWeek(now).getTime();
    const watchedThisWeek = saved.filter((item) => {
      if (!item.lastWatchedAt) return false;
      const watched = new Date(item.lastWatchedAt).getTime();
      return !Number.isNaN(watched) && watched >= weekStart;
    }).length;

    return {
      streak: displayedStreak(snapshot, today),
      best,
      week: lastSevenDays(snapshot, now),
      isTodayDone: lastDay === today,
      atRisk: isStreakAtRisk(snapshot, today),
      freezeUsed,
      watchedThisWeek,
      weeklyGoal: WEEKLY_GOAL,
      goalReached: watchedThisWeek >= WEEKLY_GOAL,
    };
  }, [best, current, days, freezeUsed, lastDay, saved]);
}
