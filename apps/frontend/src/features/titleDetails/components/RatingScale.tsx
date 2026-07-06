"use client";

import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { copy } from "../../../shared/lib/strings";

type Props = {
  value?: number;
  onChange: (value: number) => void;
  max?: number;
};

// Amber (low) → mint (high) so the colour reinforces the score.
function fillFor(value: number, max: number) {
  const ratio = Math.max(0, Math.min(1, value / max));
  const hue = 30 + ratio * (158 - 30);
  return `hsl(${hue.toFixed(0)} 82% 60%)`;
}

export function RatingScale({ value, onChange, max = 10 }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;
  const style = { "--rating-fill": fillFor(display, max) } as CSSProperties;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      onChange(Math.min(max, (value ?? 0) + 1));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      onChange(Math.max(1, (value ?? 1) - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      onChange(1);
    } else if (event.key === "End") {
      event.preventDefault();
      onChange(max);
    } else if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      const digit = Number(event.key);
      onChange(digit === 0 ? 10 : digit);
    }
  };

  return (
    <div
      className="rating-scale"
      style={style}
      role="slider"
      tabIndex={0}
      aria-label={copy.details.labels.yourRating}
      aria-valuemin={1}
      aria-valuemax={max}
      aria-valuenow={value}
      onKeyDown={handleKeyDown}
      onMouseLeave={() => setHover(null)}
    >
      <div className="rating-scale__track">
        {Array.from({ length: max }).map((_, index) => {
          const n = index + 1;
          const on = n <= display;
          const preview = hover !== null && n <= hover;
          return (
            <button
              key={n}
              type="button"
              className={`rating-pip${on ? " is-on" : ""}${
                preview ? " is-preview" : ""
              }`}
              style={{ "--pip-index": index } as CSSProperties}
              aria-label={`${n} / ${max}`}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onClick={() => onChange(n)}
            >
              <svg viewBox="0 0 24 24" className="rating-pip__drop">
                <path d="M12 3s6.5 6.9 6.5 11.3A6.5 6.5 0 0 1 5.5 14.3C5.5 9.9 12 3 12 3Z" />
              </svg>
            </button>
          );
        })}
      </div>
      <output
        className="rating-scale__value"
        key={display}
        data-empty={value == null || undefined}
      >
        <strong>{display || "–"}</strong>
        <span>/ {max}</span>
      </output>
    </div>
  );
}
