"use client";

import type { Suggestion } from "../../lib/release";
import type { ListType } from "../lib/releases";
import { copy } from "../../lib/strings";
import { ListBadges } from "./ListBadges";

type Props = {
  title: string;
  items: Suggestion[];
  isLoading: boolean;
  onSelect: (suggestion: Suggestion) => void;
  getListTypes: (suggestion: Suggestion) => ListType[];
};

export function TrendingCarousel({
  title,
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
        <div className="grid-head">
          <h3>{title}</h3>
          {isLoading && <p className="hint">{copy.hints.loadingCollection}</p>}
        </div>
        <div className="trend-carousel" aria-label={title}>
          <div className="trend-track">
            {items.map((item) => {
              const listTypes = getListTypes(item);
              const saved = listTypes.length > 0;

              return (
                <div
                  key={`${item.mediaType}-${item.id}`}
                  className={`poster-card${saved ? " saved" : ""}`}
                  onClick={() => onSelect(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(item);
                    }
                  }}
                >
                  {item.posterUrl ? (
                    <img src={item.posterUrl} alt={item.title} loading="lazy" />
                  ) : (
                    <div className="poster-card-fallback">
                      {item.title.slice(0, 1)}
                    </div>
                  )}
                  <ListBadges listTypes={listTypes} />
                </div>
            );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
