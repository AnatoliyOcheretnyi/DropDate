"use client";

import type { PersonCredit } from "../../../shared/lib/release";
import { Reveal } from "../../titleDetails/components/Reveal";
import type { TimelineEntry } from "../hooks/usePersonDetails";
import { CoverImage } from "../../../shared/ui/CoverImage";

type Props = {
  entries: TimelineEntry[];
  onSelect: (credit: Pick<PersonCredit, "tmdbId" | "mediaType">) => void;
};

export function PersonTimeline({ entries, onSelect }: Props) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="person-section person-timeline">
      <div className="person-section__head">
        <p className="eyebrow">Кар&apos;єра</p>
        <h2>
          Фільмографія
          <span className="person-section__count">{entries.length}</span>
        </h2>
      </div>

      <ol className="ptl">
        {entries.map((entry) => (
          <Reveal key={entry.key} className="ptl__reveal">
            <li className="ptl__item">
              <div className="ptl__rail" aria-hidden="true">
                <span className="ptl__year">{entry.year || "—"}</span>
                <span className="ptl__dot" />
              </div>

              <button
                type="button"
                className="ptl__card"
                onClick={() => onSelect(entry)}
                title={entry.title}
              >
                <span className="ptl__poster">
                  {entry.posterUrl ? (
                    <CoverImage src={entry.posterUrl} alt={entry.title} sizes="140px" />
                  ) : (
                    <span className="ptl__poster-fallback" aria-hidden="true">
                      {entry.title.slice(0, 1)}
                    </span>
                  )}
                </span>

                <span className="ptl__body">
                  <span className="ptl__title-row">
                    <strong className="ptl__title">{entry.title}</strong>
                    {entry.voteAverage ? (
                      <span className="ptl__rating">
                        ★ {entry.voteAverage.toFixed(1)}
                      </span>
                    ) : null}
                  </span>
                  <span className="ptl__meta">
                    <span className="ptl__type">
                      {entry.mediaType === "movie" ? "Фільм" : "Серіал"}
                    </span>
                    {entry.roles.map((role) => (
                      <span key={role} className="ptl__role">
                        {role}
                      </span>
                    ))}
                  </span>
                </span>
              </button>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
