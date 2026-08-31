"use client";

import { CoverImage } from "../../../shared/ui/CoverImage";

type Props = {
  label: string;
  dateLabel: string;
  backdrop?: string;
  /** Yesterday's per-question outcomes, if the player has any. */
  lastResult?: boolean[];
  /** Already played today: the CTA becomes the score instead. */
  playedScore?: string;
  onPlay: () => void;
};

/**
 * The daily challenge, promoted from a text button to the one full-width image
 * on the page. It pulses only while today's round is still unplayed.
 */
export function DailyBanner({
  label,
  dateLabel,
  backdrop,
  lastResult,
  playedScore,
  onPlay,
}: Props) {
  return (
    <section className={`daily-banner${playedScore ? "" : " is-open"}`}>
      <span className="daily-banner__media" aria-hidden="true">
        {backdrop ? <CoverImage src={backdrop} alt="" sizes="100vw" ariaHidden /> : null}
      </span>
      <span className="daily-banner__scrim" aria-hidden="true" />

      <div className="daily-banner__body">
        <span className="daily-banner__badge">Щоденний виклик</span>
        <h2>
          {label} · {dateLabel}
        </h2>
        <p>Однакові питання для всіх. Зіграй і поділись результатом.</p>
        {playedScore ? (
          <div className="daily-banner__done">
            <strong>{playedScore}</strong>
            <span>Сьогодні вже зіграно</span>
          </div>
        ) : (
          <button type="button" className="daily-banner__cta" onClick={onPlay}>
            Грати →
          </button>
        )}
      </div>

      {lastResult && lastResult.length > 0 ? (
        <div className="daily-banner__last">
          <span>УЧОРА</span>
          <p aria-hidden="true">
            {lastResult.map((ok, index) => (
              <i key={index} className={ok ? "is-ok" : "is-miss"} />
            ))}
          </p>
        </div>
      ) : null}
    </section>
  );
}
