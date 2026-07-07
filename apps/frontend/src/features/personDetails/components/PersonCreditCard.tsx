"use client";

import type { CSSProperties } from "react";
import type { PersonCredit } from "../../../shared/lib/release";

type Props = {
  credit: PersonCredit;
  index?: number;
  subtitle?: string;
  onSelect: (credit: PersonCredit) => void;
};

export function PersonCreditCard({ credit, index = 0, subtitle, onSelect }: Props) {
  const roleText =
    subtitle ??
    (credit.character
      ? credit.character
      : credit.job
      ? credit.job
      : credit.mediaType === "movie"
      ? "Фільм"
      : "Серіал");

  return (
    <button
      type="button"
      className="person-credit"
      style={{ ["--card-index" as string]: index } as CSSProperties}
      onClick={() => onSelect(credit)}
      title={credit.title}
    >
      <div className="person-credit__poster">
        {credit.posterUrl ? (
          <img src={credit.posterUrl} alt={credit.title} loading="lazy" />
        ) : (
          <span className="person-credit__fallback" aria-hidden="true">
            {credit.title.slice(0, 1)}
          </span>
        )}
        {credit.voteAverage ? (
          <span className="person-credit__rating">
            ★ {credit.voteAverage.toFixed(1)}
          </span>
        ) : null}
      </div>
      <strong className="person-credit__title">{credit.title}</strong>
      <span className="person-credit__meta">
        {credit.year ? <span>{credit.year}</span> : null}
        {roleText ? <span>{roleText}</span> : null}
      </span>
    </button>
  );
}
