"use client";

import type { CSSProperties } from "react";
import type { PersonCredit } from "../../../shared/lib/release";
import { LIST_META } from "../../../shared/lib/listMeta";
import type { ListType } from "../../../shared/types/releases";
import type { SavedCreditEntry } from "../hooks/usePersonDetails";

type Props = {
  entries: SavedCreditEntry[];
  onSelect: (credit: PersonCredit) => void;
};

const META_BY_TYPE = new Map(LIST_META.map((item) => [item.type, item]));

// The strongest single membership drives the badge shown on a poster.
const BADGE_PRIORITY: ListType[] = [
  "favorite",
  "liked",
  "watched",
  "watchlist",
  "follow",
  "disliked",
];

const badgeFor = (listTypes: ListType[]) => {
  for (const type of BADGE_PRIORITY) {
    if (listTypes.includes(type)) {
      return META_BY_TYPE.get(type);
    }
  }
  return undefined;
};

export function PersonSavedStrip({ entries, onSelect }: Props) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="person-section person-saved">
      <div className="person-section__head">
        <p className="eyebrow">Ваша колекція</p>
        <h2>
          Уже у ваших списках
          <span className="person-section__count">{entries.length}</span>
        </h2>
      </div>
      <div className="person-saved__strip">
        {entries.map(({ credit, listTypes }, index) => {
          const badge = badgeFor(listTypes);
          return (
            <button
              key={`${credit.mediaType}:${credit.tmdbId}`}
              type="button"
              className="person-saved__card"
              style={{ ["--card-index" as string]: index } as CSSProperties}
              onClick={() => onSelect(credit)}
              title={credit.title}
            >
              <div className="person-saved__poster">
                {credit.posterUrl ? (
                  <img src={credit.posterUrl} alt={credit.title} loading="lazy" />
                ) : (
                  <span aria-hidden="true">{credit.title.slice(0, 1)}</span>
                )}
                {badge ? (
                  <span className="person-saved__badge" data-list={badge.type}>
                    <span className="person-saved__badge-icon">{badge.icon}</span>
                    {badge.label}
                  </span>
                ) : null}
              </div>
              <strong className="person-saved__title">{credit.title}</strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}
