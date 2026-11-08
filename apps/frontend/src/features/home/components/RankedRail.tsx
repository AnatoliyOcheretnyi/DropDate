"use client";
import { MovieCardSurface } from "../../../shared/ui/MovieCardSurface";

import { memo } from "react";
import type { Suggestion } from "../../../shared/lib/release";
import { copy } from "../../../shared/lib/strings";
import { CoverImage } from "../../../shared/ui/CoverImage";

type Props = {
  title: string;
  kicker?: string;
  items: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
};

function RankedRailComponent({ title, kicker, items, onSelect }: Props) {
  const ranked = items.slice(0, 10);

  if (ranked.length === 0) {
    return null;
  }

  return (
    <section className="trend-section trend-bleed ranked-section">
      <div className="trend-inner">
        <div className="trend-shell">
          <div className="trend-head">
            <div className="trend-copy">
              {kicker ? <p className="trend-kicker">{kicker}</p> : null}
              <div className="grid-head">
                <h3>{title}</h3>
              </div>
            </div>
          </div>
          <div className="ranked-carousel" aria-label={title}>
            <div className="ranked-track">
              {ranked.map((item, index) => (
                <MovieCardSurface tmdbId={item.id} mediaType={item.mediaType} title={item.title}
                  key={`${item.mediaType}-${item.id}`}
                  className="ranked-card"
                  onActivate={() => onSelect(item)}
                >
                  <span className="ranked-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="ranked-poster">
                    {item.posterUrl ? (
                      <CoverImage
                        src={item.posterUrl}
                        alt={item.title}
                        sizes="(max-width: 900px) 34vw, 168px"
                      />
                    ) : (
                      <span className="ranked-poster__fallback">
                        {item.title.slice(0, 1)}
                      </span>
                    )}
                  </span>
                  <span className="ranked-card__content">
                    <strong>{item.title}</strong>
                    <span>
                      {item.mediaType === "movie"
                        ? copy.mediaType.movie
                        : copy.mediaType.series}
                      {item.year ? ` · ${item.year}` : ""}
                    </span>
                  </span>
                </MovieCardSurface>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const RankedRail = memo(RankedRailComponent);
