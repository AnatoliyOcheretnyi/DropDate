"use client";

import type { PersonCredit } from "../../../shared/lib/release";
import type { CreditGroup } from "../hooks/usePersonDetails";
import { PersonCreditCard } from "./PersonCreditCard";

type Props = {
  group: CreditGroup;
  isPrimary?: boolean;
  onSelect: (credit: PersonCredit) => void;
};

export function PersonFilmographySection({ group, isPrimary, onSelect }: Props) {
  return (
    <section
      className={`person-section${isPrimary ? " person-section--primary" : ""}`}
    >
      <div className="person-section__head">
        <p className="eyebrow">{group.eyebrow}</p>
        <h2>
          {group.label}
          <span className="person-section__count">{group.credits.length}</span>
        </h2>
      </div>
      <div className="person-grid">
        {group.credits.map((credit, index) => (
          <PersonCreditCard
            key={`${credit.mediaType}:${credit.tmdbId}`}
            credit={credit}
            index={index}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
