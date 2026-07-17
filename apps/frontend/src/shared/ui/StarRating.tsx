"use client";

import { useState } from "react";

type Props = {
  /** Current rating on a 0–10 scale (0 = unrated). */
  value?: number;
  /** Called with the next 0–10 rating (0 clears it). Ignored when readOnly. */
  onChange?: (next: number) => void;
  size?: "sm" | "md";
  /** Display-only mode: no hover preview, stars are not clickable. */
  readOnly?: boolean;
};

const STARS = [1, 2, 3, 4, 5];

/**
 * Five-star control mapped onto a 0–10 scale (each star = 2 points). Clicking an
 * already-selected star clears the rating. Hover previews the pending value.
 * With `readOnly` it renders as a static display (e.g. a friend's rating).
 */
export function StarRating({ value = 0, onChange, size = "sm", readOnly = false }: Props) {
  const [hover, setHover] = useState(0);
  const shown = readOnly ? value : hover || value;
  const active = Math.round(shown / 2);

  return (
    <div
      className={`star-rating star-rating--${size}${readOnly ? " star-rating--readonly" : ""}`}
      role="group"
      aria-label="Оцінка"
      onMouseLeave={readOnly ? undefined : () => setHover(0)}
    >
      {STARS.map((star) => {
        const points = star * 2;
        const filled = star <= active;
        if (readOnly) {
          return (
            <span
              key={star}
              className={`star-rating__star${filled ? " is-filled" : ""}`}
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.9l-5.8 3.05 1.1-6.47-4.7-4.58 6.5-.95L12 2.5Z" />
              </svg>
            </span>
          );
        }
        return (
          <button
            key={star}
            type="button"
            className={`star-rating__star${filled ? " is-filled" : ""}`}
            aria-label={`${points} з 10`}
            aria-pressed={filled}
            onMouseEnter={() => setHover(points)}
            onClick={(event) => {
              event.stopPropagation();
              onChange?.(value === points ? 0 : points);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.9l-5.8 3.05 1.1-6.47-4.7-4.58 6.5-.95L12 2.5Z" />
            </svg>
          </button>
        );
      })}
      {shown > 0 ? (
        <span className="star-rating__value">{shown}/10</span>
      ) : null}
    </div>
  );
}
