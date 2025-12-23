"use client";

import type { Suggestion } from "../../lib/release";

type Props = {
  title: string;
  items: Suggestion[];
  isLoading: boolean;
  onSelect: (suggestion: Suggestion) => void;
  isSaved: (suggestion: Suggestion) => boolean;
  isBusy: (suggestion: Suggestion) => boolean;
};

export function TrendingCarousel({
  title,
  items,
  isLoading,
  onSelect,
  isSaved,
  isBusy,
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

              return (
                <button
                  key={`${item.mediaType}-${item.id}`}
                  type="button"
                  className={`poster-card${saved ? " saved" : ""}`}
                  onClick={() => onSelect(item)}
                  disabled={isBusy(item)}
                >
                  {item.posterUrl ? (
                    <img src={item.posterUrl} alt={item.title} loading="lazy" />
                  ) : (
                    <div className="poster-card-fallback">
                      {item.title.slice(0, 1)}
                    </div>
                  )}
                <div className="poster-overlay" aria-hidden="true">
                  <span className={`poster-cta${saved ? " saved" : ""}`}>
                    {saved ? "Додано" : "+"}
                  </span>
                </div>
              </button>
            );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
