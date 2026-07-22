export type AchievementUnlock = { listKey: string; tier: number };
type Listener = (items: AchievementUnlock[]) => void;
const listeners = new Set<Listener>();
export function publishAchievementUnlocks(items: AchievementUnlock[]) {
  if (items.length) listeners.forEach((listener) => listener(items));
}
export function subscribeAchievementUnlocks(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
