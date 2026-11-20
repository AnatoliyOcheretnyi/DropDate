/**
 * Streak arithmetic, kept free of storage and React so the rules stay
 * readable: a day counts once, one missed day per streak is forgiven, and a
 * longer gap starts over.
 */

export type StreakSnapshot = {
  /** Consecutive active days, including any day covered by the freeze. */
  current: number;
  best: number;
  /** Last day with activity, as a local `YYYY-MM-DD` key. */
  lastDay: string | null;
  /** A streak gets one forgiven miss; spending it sets this. */
  freezeUsed: boolean;
  /** Recent active days, newest last, capped so storage stays small. */
  days: string[];
};

export type StreakOutcome = "same-day" | "extended" | "frozen" | "restarted";

export const WEEKLY_GOAL = 3;
const HISTORY_LIMIT = 60;

export const emptyStreak: StreakSnapshot = {
  current: 0,
  best: 0,
  lastDay: null,
  freezeUsed: false,
  days: [],
};

export const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

export const parseDayKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
};

export const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

/** Whole days between two day keys, ignoring time of day entirely. */
export const daysBetween = (from: string, to: string) =>
  Math.round(
    (parseDayKey(to).getTime() - parseDayKey(from).getTime()) / 86_400_000,
  );

/** Records activity for `today` and returns the new snapshot plus what happened. */
export function recordDay(
  state: StreakSnapshot,
  today: string,
): { next: StreakSnapshot; outcome: StreakOutcome } {
  if (state.lastDay === today) {
    return { next: state, outcome: "same-day" };
  }

  const gap = state.lastDay === null ? null : daysBetween(state.lastDay, today);
  let current = 1;
  let freezeUsed = false;
  let outcome: StreakOutcome = "restarted";

  if (gap === 1) {
    current = state.current + 1;
    freezeUsed = state.freezeUsed;
    outcome = "extended";
  } else if (gap === 2 && !state.freezeUsed) {
    // One missed day per streak is forgiven rather than punished — the point
    // of the streak is to bring people back, not to shame a busy Tuesday.
    current = state.current + 1;
    freezeUsed = true;
    outcome = "frozen";
  }

  return {
    next: {
      current,
      best: Math.max(state.best, current),
      lastDay: today,
      freezeUsed,
      days: [...state.days, today].slice(-HISTORY_LIMIT),
    },
    outcome,
  };
}

/**
 * What the UI should show. The stored `current` survives until the streak is
 * genuinely unrecoverable, so a lapsed streak reads as 0 without erasing the
 * record on disk.
 */
export function displayedStreak(state: StreakSnapshot, today: string) {
  if (!state.lastDay) return 0;
  const gap = daysBetween(state.lastDay, today);
  if (gap <= 1) return state.current;
  if (gap === 2 && !state.freezeUsed) return state.current;
  return 0;
}

/** True while today can still extend the streak rather than start a new one. */
export function isStreakAtRisk(state: StreakSnapshot, today: string) {
  if (!state.lastDay || state.current === 0) return false;
  return daysBetween(state.lastDay, today) >= 1;
}

const WEEKDAY_LABELS = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export type StreakDay = {
  key: string;
  label: string;
  hit: boolean;
  isToday: boolean;
};

/** The last seven days, oldest first — the row of dots under the flame. */
export function lastSevenDays(
  state: StreakSnapshot,
  now: Date = new Date(),
): StreakDay[] {
  const hits = new Set(state.days);
  const today = dayKey(now);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(now, index - 6);
    const key = dayKey(date);
    return {
      key,
      label: WEEKDAY_LABELS[date.getDay()],
      hit: hits.has(key),
      isToday: key === today,
    };
  });
}

/** Monday-based start of the week `now` falls in, for the weekly goal. */
export function startOfWeek(now: Date = new Date()) {
  const weekday = now.getDay() || 7;
  const start = addDays(now, 1 - weekday);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate());
}
