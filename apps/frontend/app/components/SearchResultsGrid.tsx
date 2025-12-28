"use client";

import type { Suggestion } from "../../lib/release";
import { copy } from "../../lib/strings";

type Props = {
  items: Suggestion[];
  isLoading: boolean;
  onSelect: (suggestion: Suggestion) => void;
  onAdd?: (suggestion: Suggestion) => void;
  isSaved: (suggestion: Suggestion) => boolean;
  isBusy: (suggestion: Suggestion) => boolean;
  isAdding?: (suggestion: Suggestion) => boolean;
  title?: string;
  emptyLabel?: string;
  showEmpty?: boolean;
};

export function SearchResultsGrid({
  items,
  isLoading,
  onSelect,
  onAdd,
  isSaved,
  isBusy,
  isAdding = () => false,
  title = copy.sections.recommendations,
  emptyLabel = copy.search.empty,
  showEmpty = false,
}: Props) {
  if (!isLoading && items.length === 0 && !showEmpty) {
    return null;
  }

  return (
    <section className="search-grid">
      <div className="grid-head">
        <h3>{title}</h3>
        {isLoading && <p className="hint">{copy.hints.loadingCollection}</p>}
      </div>
      {!isLoading && items.length === 0 ? (
        <p className="hint">{emptyLabel}</p>
      ) : (
        <div className="poster-grid">
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
                    <span className="poster-cta saved">{copy.actions.added}</span>
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
      )}
    </section>
  );
}
