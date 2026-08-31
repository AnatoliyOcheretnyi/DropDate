"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Confetti } from "./Confetti";
import { ShareResultButton } from "./ShareResultButton";
import { useCountUp } from "../hooks/useCountUp";

export type SummaryStat = {
  label: string;
  /** Counts up when numeric; strings like "8 / 10" render as-is. */
  value: number | string;
  suffix?: string;
};

type Props = {
  title: string;
  stats: SummaryStat[];
  /** Per-question outcomes, drawn as the shareable square row. */
  squares?: boolean[];
  shareText?: string;
  onReplay: () => void;
  replayLabel?: string;
  celebrate?: boolean;
  extra?: ReactNode;
};

function StatValue({ stat }: { stat: SummaryStat }) {
  const numeric = typeof stat.value === "number" ? stat.value : 0;
  const counted = useCountUp(numeric);
  return (
    <strong>
      {typeof stat.value === "number" ? counted : stat.value}
      {stat.suffix ?? ""}
    </strong>
  );
}

/**
 * One summary for all eight games. Each screen used to carry its own copy,
 * which is why the same result looked slightly different every time.
 */
export function GameSummary({
  title,
  stats,
  squares,
  shareText,
  onReplay,
  replayLabel = "Зіграти ще",
  celebrate = false,
  extra,
}: Props) {
  const router = useRouter();

  return (
    <div className="game-summary">
      {celebrate ? <Confetti /> : null}
      <h2>{title}</h2>

      <div className="game-summary__stats">
        {stats.map((stat) => (
          <div key={stat.label} className="game-summary__stat">
            <StatValue stat={stat} />
            <span>{stat.label}</span>
          </div>
        ))}
      </div>

      {squares && squares.length > 0 ? (
        <p className="game-summary__squares" aria-hidden="true">
          {squares.map((ok, index) => (
            <span key={index} className={ok ? "is-ok" : "is-miss"} />
          ))}
        </p>
      ) : null}

      {extra}

      <div className="game-summary__actions">
        <button type="button" className="primary" onClick={onReplay}>
          {replayLabel}
        </button>
        {shareText ? <ShareResultButton text={shareText} /> : null}
        <button type="button" onClick={() => router.push("/games")}>
          До ігор
        </button>
      </div>
    </div>
  );
}
