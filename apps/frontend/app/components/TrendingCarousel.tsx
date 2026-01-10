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
  onAdd?: (suggestion: Suggestion) => void;
  getListTypes: (suggestion: Suggestion) => ListType[];
  isBusy: (suggestion: Suggestion) => boolean;
  isAdding?: (suggestion: Suggestion) => boolean;
};

export function TrendingCarousel({
  title,
  items,
  isLoading,
  onSelect,
  onAdd,
  getListTypes,
  isBusy,
  isAdding = () => false,
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
              const isItemAdding = isAdding(item);
              const canAdd = Boolean(onAdd);

              return (
                <div
                  key={`${item.mediaType}-${item.id}`}
                  className={`poster-card${saved ? " saved" : ""}`}
                  onClick={() => onSelect(item)}
                  role="button"
                  tabIndex={0}
                  aria-disabled={isBusy(item)}
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
                  <div className="poster-overlay" aria-hidden="true">
                    {canAdd ? (
                      <button
                        type="button"
                        className="poster-cta"
                        onClick={(event) => {
                          event.stopPropagation();
                          onAdd?.(item);
                        }}
                        disabled={isItemAdding}
                      >
                        +
                      </button>
                    ) : null}
                    {saved && (
                      <span className="poster-cta saved">{copy.actions.added}</span>
                    )}
                  </div>
                </div>
            );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
