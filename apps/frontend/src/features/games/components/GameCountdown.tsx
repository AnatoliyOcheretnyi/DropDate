"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "../hooks/useCountUp";

type Props = {
  from?: number;
  onDone: () => void;
  label?: string;
};

const RING_RADIUS = 52;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/**
 * Three beats before a timed round starts. Without it the first question of
 * Blitz and Year appears at the same moment its clock starts running, so the
 * opening second is spent reading rather than playing.
 */
export function GameCountdown({ from = 3, onDone, label = "Готуйся" }: Props) {
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (prefersReducedMotion()) {
      onDone();
      return;
    }
    if (value <= 0) {
      onDone();
      return;
    }
    const timeout = window.setTimeout(() => setValue((prev) => prev - 1), 800);
    return () => window.clearTimeout(timeout);
  }, [onDone, value]);

  if (value <= 0) {
    return null;
  }

  return (
    <div className="game-countdown" role="status" aria-live="polite">
      <span className="game-countdown__ring" aria-hidden="true">
        <svg viewBox="0 0 120 120">
          <circle className="game-countdown__track" cx="60" cy="60" r={RING_RADIUS} />
          <circle
            className="game-countdown__value"
            cx="60"
            cy="60"
            r={RING_RADIUS}
            style={{
              strokeDasharray: RING_LENGTH,
              strokeDashoffset: RING_LENGTH * (1 - value / from),
            }}
          />
        </svg>
        <b key={value}>{value}</b>
      </span>
      <p>{label}</p>
    </div>
  );
}
