"use client";

import { useEffect, useState } from "react";

export type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const SECOND = 1000;

const split = (remainingMs: number): Countdown => {
  const total = Math.max(0, Math.floor(remainingMs / SECOND));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
};

/**
 * Ticks once a second toward `target` (a timestamp), or stays null when there
 * is nothing to count toward.
 *
 * The first value is only computed after mount. Server and client would
 * otherwise disagree about "now" and React would report a hydration mismatch on
 * every load, so the countdown deliberately renders as absent for one frame.
 */
export function useCountdown(target: number | null) {
  const [remaining, setRemaining] = useState<Countdown | null>(null);

  useEffect(() => {
    if (target === null) {
      setRemaining(null);
      return;
    }

    const tick = () => setRemaining(split(target - Date.now()));
    tick();

    const timer = window.setInterval(tick, SECOND);
    return () => window.clearInterval(timer);
  }, [target]);

  const isPast = target !== null && remaining !== null &&
    remaining.days === 0 &&
    remaining.hours === 0 &&
    remaining.minutes === 0 &&
    remaining.seconds === 0;

  return { remaining, isPast };
}
