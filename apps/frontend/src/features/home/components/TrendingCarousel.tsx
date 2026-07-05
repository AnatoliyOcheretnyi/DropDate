"use client";

import { memo } from "react";
import type { Suggestion } from "../../../shared/lib/release";
import type { ListType } from "../../../shared/types/releases";
import { copy } from "../../../shared/lib/strings";
import { PosterCard } from "../../../shared/ui/PosterCard";

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

                return (
                  <PosterCard
                    key={`${item.mediaType}-${item.id}`}
                    item={item}
                    listTypes={listTypes}
                    imageSizes="(max-width: 900px) 40vw, 176px"
                    onSelect={onSelect}
                  />
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
