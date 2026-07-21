"use client";

import type { PersonPick } from "../../../shared/lib/release";
import { CoverImage } from "../../../shared/ui/CoverImage";

type Props = {
  pick: PersonPick;
  personName: string;
  onSelect: (pick: PersonPick) => void;
};

export function PersonRecommendation({ pick, personName, onSelect }: Props) {
  return (
    <section className="person-pick">
      <div className="person-pick__glow" aria-hidden="true" />
      <button
        type="button"
        className="person-pick__inner"
        onClick={() => onSelect(pick)}
      >
        <div className="person-pick__poster">
          {pick.posterUrl ? (
            <CoverImage src={pick.posterUrl} alt={pick.title} sizes="180px" />
          ) : (
            <span aria-hidden="true">{pick.title.slice(0, 1)}</span>
          )}
        </div>
        <div className="person-pick__body">
          <span className="person-pick__eyebrow">
            <span aria-hidden="true">✨</span> Персональна підказка
          </span>
          <strong className="person-pick__title">
            {pick.title}
            {pick.year ? <span> · {pick.year}</span> : null}
          </strong>
          <p className="person-pick__reason">{pick.reason}</p>
          <span className="person-pick__cta">
            Роботи, які варто глянути в {personName}
            <span aria-hidden="true"> →</span>
          </span>
        </div>
      </button>
    </section>
  );
}
