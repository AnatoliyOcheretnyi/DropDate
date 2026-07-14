"use client";

import type { UnlockedAchievement } from "./achievements";

// A tiny module-level pub/sub so the achievement-unlock celebration can be
// mounted once at the app root while any save mutation, anywhere in the
// tree, can trigger it — without threading a callback through every screen.
type Listener = (unlocks: UnlockedAchievement[]) => void;

const listeners = new Set<Listener>();

export function publishUnlocks(unlocks: UnlockedAchievement[]) {
  if (unlocks.length === 0) {
    return;
  }
  listeners.forEach((listener) => listener(unlocks));
}

export function subscribeUnlocks(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
