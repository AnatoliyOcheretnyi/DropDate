"use client";

import type { Details } from "../../../shared/lib/release";
import { Icon } from "../../../shared/ui/Icon";
import { useCountdown } from "../hooks/useCountdown";

type Props = {
  details: Details | null;
  releaseAt: number | null;
};

const UNITS = [
  { key: "days", label: "ДНІВ" },
  { key: "hours", label: "ГОД" },
  { key: "minutes", label: "ХВ" },
  { key: "seconds", label: "СЕК" },
] as const;

// Day and month only: asking Intl for the year as well appends the Ukrainian
// era marker ("16 грудня 2026 р."), which the design does not use.
const dayMonthFormatter = new Intl.DateTimeFormat("uk-UA", {
  day: "numeric",
  month: "long",
});

const formatReleaseDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${dayMonthFormatter.format(date)} ${date.getFullYear()}`;
};

const pad = (value: number) => String(value).padStart(2, "0");

/** Where the title lands: cinemas for a film, the next episode for a series. */
const venueLabel = (details: Details | null) =>
  details?.mediaType === "tv" ? "нова серія" : "у кінотеатрах";

export function HeroCountdown({ details, releaseAt }: Props) {
  const { remaining, isPast } = useCountdown(releaseAt);

  // Nothing to count toward: an already-released title, or a date the API
  // doesn't have. Showing four zeroes would be worse than showing nothing.
  if (releaseAt === null || isPast) {
    return null;
  }

  const votes = details?.voteCount ?? 0;
  const rating = details?.voteAverage ?? 0;

  return (
    <aside className="hero-countdown">
      <div className="hero-countdown__head">
        <p className="hero-countdown__kicker">ДО РЕЛІЗУ ЗАЛИШИЛОСЬ</p>
        <Icon name="radio" size={16} className="hero-countdown__live" />
      </div>

      {/*
        Announced politely, but only the day figure is exposed to assistive tech:
        re-announcing a value that changes every second would make the page
        unusable with a screen reader.
      */}
      <div
        className="hero-countdown__units"
        aria-live="polite"
        aria-label={
          remaining ? `До релізу залишилось ${remaining.days} днів` : undefined
        }
      >
        {UNITS.map((unit) => (
          <div key={unit.key} className="hero-countdown__unit">
            <strong aria-hidden="true">
              {remaining ? pad(remaining[unit.key]) : "--"}
            </strong>
            <span aria-hidden="true">{unit.label}</span>
          </div>
        ))}
      </div>

      <p className="hero-countdown__date">
        <Icon name="calendar-check" size={17} />
        <span>
          {formatReleaseDate(releaseAt)} · {venueLabel(details)}
        </span>
      </p>

      {votes > 0 ? (
        <p className="hero-countdown__meta">
          <Icon name="star" size={15} />
          <span>
            {rating.toFixed(1)} · {votes.toLocaleString("uk-UA")} оцінок на TMDB
          </span>
        </p>
      ) : null}
    </aside>
  );
}
