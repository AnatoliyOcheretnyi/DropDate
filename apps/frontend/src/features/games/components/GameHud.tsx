"use client";

import type { ReactNode } from "react";

export type HudMetric = {
  label: string;
  value: string;
  /** A hot streak is the one number allowed to shout. */
  hot?: boolean;
};

type Props = {
  kicker: string;
  mode?: "rounds" | "survival" | "timed";
  metrics?: HudMetric[];
  /** 0..1 — the thin bar under the row (rounds mode). */
  progress?: number;
  /** 0..1 — how much of the round clock is left (timed mode). */
  timeRatio?: number;
  timeLabel?: string;
  lives?: { current: number; max: number };
  /** Rendered before the kicker — the friend whose taste is being guessed. */
  avatar?: ReactNode;
};

const RING_RADIUS = 15;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/**
 * One round header for every game. Replaces three different ones that showed
 * the same three numbers: `games-round__side`, `blitz__top` and a hand-rolled
 * `<header>` in the people game.
 */
export function GameHud({
  kicker,
  mode = "rounds",
  metrics = [],
  progress,
  timeRatio,
  timeLabel,
  lives,
  avatar,
}: Props) {
  const clampedTime = Math.max(0, Math.min(1, timeRatio ?? 0));
  const isCritical = mode === "timed" && clampedTime < 0.25;

  return (
    <div className={`game-hud game-hud--${mode}`}>
      <div className="game-hud__row">
        <div className="game-hud__lead">
          {avatar ? <span className="game-hud__avatar">{avatar}</span> : null}
          <p className="game-hud__kicker">{kicker}</p>
        </div>

        <div className="game-hud__metrics">
          {metrics.map((metric) => (
            <span key={metric.label} className="game-hud__metric">
              <span className="game-hud__metric-label">{metric.label}</span>
              <b className={metric.hot ? "is-hot" : undefined}>{metric.value}</b>
            </span>
          ))}

          {lives ? (
            <span
              className="game-hud__lives"
              aria-label={`Життя: ${lives.current} з ${lives.max}`}
            >
              {Array.from({ length: lives.max }).map((_, index) => (
                <span
                  key={index}
                  className={index < lives.current ? "" : "is-lost"}
                  aria-hidden="true"
                >
                  ♥
                </span>
              ))}
            </span>
          ) : null}

          {mode === "timed" ? (
            <span
              className={`game-hud__ring${isCritical ? " is-critical" : ""}`}
              aria-hidden="true"
            >
              <svg viewBox="0 0 36 36">
                <circle className="game-hud__ring-track" cx="18" cy="18" r={RING_RADIUS} />
                <circle
                  className="game-hud__ring-value"
                  cx="18"
                  cy="18"
                  r={RING_RADIUS}
                  style={{
                    strokeDasharray: RING_LENGTH,
                    strokeDashoffset: RING_LENGTH * (1 - clampedTime),
                  }}
                />
              </svg>
              {timeLabel ? <b>{timeLabel}</b> : null}
            </span>
          ) : null}
        </div>
      </div>

      {mode === "rounds" && typeof progress === "number" ? (
        <div className="game-hud__progress" aria-hidden="true">
          <span style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
        </div>
      ) : null}
    </div>
  );
}
