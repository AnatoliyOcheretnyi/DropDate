"use client";

import type { Suggestion } from "../shared/lib/release";
import type { ListType } from "../shared/types/releases";
import { copy } from "../shared/lib/strings";
import { ListBadges } from "../shared/ui/ListBadges";
import { MovieInfoButton } from "../shared/ui/MovieInfoButton";

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
                role="button"
                tabIndex={0}
                className={`poster-card${saved ? " saved" : ""}`}
                onClick={() => onSelect(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(item);
                  }
                }}
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
                <MovieInfoButton
                  tmdbId={item.id}
                  mediaType={item.mediaType}
                  title={item.title}
                  onActivate={() => onSelect(item)}
                />
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
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
