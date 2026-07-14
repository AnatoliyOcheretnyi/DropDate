"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { subscribeUnlocks } from "../shared/lib/achievementBus";
import { getTierMeta, type UnlockedAchievement } from "../shared/lib/achievements";

const VISIBLE_MS = 4200;

/**
 * Mounted once at the app root. Listens for achievement-unlock events fired
 * by any save mutation anywhere in the tree and celebrates them one at a
 * time, regardless of which screen triggered the unlock.
 */
export function AchievementUnlockOverlay() {
  const router = useRouter();
  const [queue, setQueue] = useState<UnlockedAchievement[]>([]);
  const [current, setCurrent] = useState<UnlockedAchievement | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return subscribeUnlocks((unlocks) => {
      setQueue((prev) => [...prev, ...unlocks]);
    });
  }, []);

  const dismiss = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setLeaving(true);
    window.setTimeout(() => {
      setCurrent(null);
      setLeaving(false);
    }, 200);
  }, []);

  useEffect(() => {
    if (current || queue.length === 0) {
      return;
    }
    const [next, ...rest] = queue;
    setCurrent(next);
    setQueue(rest);
  }, [current, queue]);

  useEffect(() => {
    if (!current) {
      return;
    }
    timerRef.current = window.setTimeout(dismiss, VISIBLE_MS);
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [current, dismiss]);

  if (!current) {
    return null;
  }

  const meta = getTierMeta(current.listKey, current.tier);

  return (
    <div
      className={`achievement-toast${leaving ? " achievement-toast--leaving" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="achievement-toast__shine" aria-hidden="true" />
      <span className="achievement-toast__icon" aria-hidden="true">
        {meta?.icon ?? "🏆"}
      </span>
      <div className="achievement-toast__body">
        <p className="achievement-toast__eyebrow">Новий рівень</p>
        <strong className="achievement-toast__title">
          {meta?.name ?? "Досягнення"}
        </strong>
      </div>
      <button
        type="button"
        className="achievement-toast__link"
        onClick={() => {
          dismiss();
          router.push("/profile");
        }}
      >
        Прогрес →
      </button>
    </div>
  );
}
