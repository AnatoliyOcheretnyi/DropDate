"use client";

import type { Suggestion } from "../../lib/release";

type Props = {
  title: string;
  items: Suggestion[];
  isLoading: boolean;
  onSelect: (suggestion: Suggestion) => void;
  onAdd?: (suggestion: Suggestion) => void;
  isSaved: (suggestion: Suggestion) => boolean;
  isBusy: (suggestion: Suggestion) => boolean;
  isAdding?: (suggestion: Suggestion) => boolean;
};

export function TrendingCarousel({
  title,
  items,
  isLoading,
  onSelect,
  onAdd,
  isSaved,
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
          {isLoading && <p className="hint">Завантажуємо підбірку…</p>}
        </div>
        <div className="trend-carousel" aria-label={title}>
          <div className="trend-track">
            {items.map((item) => {
              const saved = isSaved(item);
              const isItemAdding = isAdding(item);
              const canAdd = Boolean(onAdd) && !saved;

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
                  <div className="poster-overlay" aria-hidden="true">
                    {saved ? (
                      <span className="poster-cta saved">Додано</span>
                    ) : canAdd ? (
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
