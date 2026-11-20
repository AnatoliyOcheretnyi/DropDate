import { create } from "zustand";

import {
  storageGetJSON,
  storageKeys,
  storageSetJSON,
} from "../../../shared/utils/storage";
import {
  dayKey,
  emptyStreak,
  recordDay,
  type StreakOutcome,
  type StreakSnapshot,
} from "./streak";

type StreakState = StreakSnapshot & {
  /** Marks today as active. Idempotent — a second call the same day is free. */
  recordActivity: () => StreakOutcome;
  reset: () => void;
};

const load = (): StreakSnapshot => {
  const stored = storageGetJSON<Partial<StreakSnapshot>>(storageKeys.streak);
  if (!stored) return emptyStreak;
  return {
    current: stored.current ?? 0,
    best: stored.best ?? 0,
    lastDay: stored.lastDay ?? null,
    freezeUsed: stored.freezeUsed ?? false,
    days: Array.isArray(stored.days) ? stored.days : [],
  };
};

const persist = (snapshot: StreakSnapshot) =>
  storageSetJSON(storageKeys.streak, snapshot);

// MMKV reads are synchronous, so the streak is on screen in the first frame
// rather than popping in after a hydration pass.
export const useStreakStore = create<StreakState>((set, get) => ({
  ...load(),
  recordActivity: () => {
    const state = get();
    const { next, outcome } = recordDay(
      {
        current: state.current,
        best: state.best,
        lastDay: state.lastDay,
        freezeUsed: state.freezeUsed,
        days: state.days,
      },
      dayKey(new Date()),
    );
    if (outcome === "same-day") return outcome;
    persist(next);
    set(next);
    return outcome;
  },
  reset: () => {
    persist(emptyStreak);
    set(emptyStreak);
  },
}));

/**
 * The entry point for everything that counts as activity. Called from data
 * layers rather than components so the streak cannot depend on a screen being
 * mounted.
 */
export const recordStreakActivity = () =>
  useStreakStore.getState().recordActivity();
