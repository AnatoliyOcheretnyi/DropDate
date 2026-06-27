"use client";

import { memo } from "react";
import type { Suggestion } from "../../../shared/lib/release";
import type { ListType } from "../../../shared/types/releases";
import { copy } from "../../../shared/lib/strings";
import { ListBadges } from "../../../shared/ui/ListBadges";

type Props = {
  title: string;
  kicker?: string;
  items: Suggestion[];
  isLoading: boolean;
  onSelect: (suggestion: Suggestion) => void;
  getListTypes: (suggestion: Suggestion) => ListType[];
};

function TrendingCarouselComponent({
  title,
  kicker,
  items,
  isLoading,
  onSelect,
  getListTypes,
}: Props) {
  if (!isLoading && items.length === 0) {
    return null;
  }

  return (
    <section className="trend-section trend-bleed">
      <div className="trend-inner">
        <div className="trend-shell">
          <div className="trend-head">
            <div className="trend-copy">
              {kicker ? <p className="trend-kicker">{kicker}</p> : null}
              <div className="grid-head">
                <h3>{title}</h3>
                {isLoading && <p className="hint">{copy.hints.loadingCollection}</p>}
              </div>
            </div>
          </div>
          <div className="trend-carousel" aria-label={title}>
            <div className="trend-track">
              {items.map((item) => {
                const listTypes = getListTypes(item);
                const saved = listTypes.length > 0;

                return (
                  <button
                    key={`${item.mediaType}-${item.id}`}
                    type="button"
                    className={`poster-card${saved ? " saved" : ""}`}
                    onClick={() => onSelect(item)}
                  >
                    <div className="poster-card__media">
                      {item.posterUrl ? (
                        <img src={item.posterUrl} alt={item.title} loading="lazy" />
                      ) : (
                        <div className="poster-card-fallback">
                          {item.title.slice(0, 1)}
                        </div>
                      )}
                    </div>
                    <ListBadges listTypes={listTypes} />
                    <div className="poster-card__content">
                      <span className="poster-card__title">{item.title}</span>
                      <span className="poster-card__meta">
                        {item.mediaType === "movie"
                          ? copy.mediaType.movie
                          : copy.mediaType.series}
                        {item.year ? ` · ${item.year}` : ""}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const TrendingCarousel = memo(TrendingCarouselComponent);
