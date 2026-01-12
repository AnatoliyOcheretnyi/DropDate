"use client";

import type { Suggestion } from "../../lib/release";
import type { ListType } from "../../app/lib/releases";
import { copy } from "../../lib/strings";
import { ListBadges } from "../shared/ui/ListBadges";

type Props = {
  items: Suggestion[];
  isLoading: boolean;
  onSelect: (suggestion: Suggestion) => void;
  getListTypes: (suggestion: Suggestion) => ListType[];
  title?: string;
  emptyLabel?: string;
  showEmpty?: boolean;
};

export function SearchResultsGrid({
  items,
  isLoading,
  onSelect,
  getListTypes,
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
      )}
    </section>
  );
}
