"use client";

import type { ReactNode } from "react";
import type { Suggestion } from "../shared/lib/release";
import type { ListType } from "../shared/types/releases";
import { copy } from "../shared/lib/strings";
import { PosterCard } from "../shared/ui/PosterCard";

type Props = {
  items: Suggestion[];
  isLoading: boolean;
  onSelect: (suggestion: Suggestion) => void;
  getListTypes: (suggestion: Suggestion) => ListType[];
  onChangeLists?: (suggestion: Suggestion, next: ListType[]) => void;
  title?: string;
  emptyLabel?: string;
  /** Overrides the default text-only empty state with custom content
   * (e.g. an icon + call to action). Falls back to `emptyLabel` when unset. */
  emptySlot?: ReactNode;
  showEmpty?: boolean;
  skeletonCount?: number;
};

function PosterCardSkeleton() {
  return (
    <div className="poster-card poster-card--skeleton" aria-hidden="true">
      <div className="poster-card__media" />
    </div>
  );
}

export function SearchResultsGrid({
  items,
  isLoading,
  onSelect,
  getListTypes,
  onChangeLists,
  title = copy.sections.recommendations,
  emptyLabel = copy.search.empty,
  emptySlot,
  showEmpty = false,
  skeletonCount = 10,
}: Props) {
  if (!isLoading && items.length === 0 && !showEmpty) {
    return null;
  }

  const showSkeleton = isLoading && items.length === 0;
  const showEmptyState = !isLoading && items.length === 0;

  return (
    <section className="search-grid">
      <div className="grid-head">
        <h3>{title}</h3>
        {isLoading && items.length > 0 && (
          <p className="hint">{copy.hints.loadingCollection}</p>
        )}
      </div>
      {showEmptyState ? (
        emptySlot ?? <p className="hint">{emptyLabel}</p>
      ) : (
        <div className="poster-grid">
          {showSkeleton
            ? Array.from({ length: skeletonCount }).map((_, index) => (
                <PosterCardSkeleton key={index} />
              ))
            : items.map((item) => {
                const listTypes = getListTypes(item);

                return (
                  <PosterCard
                    key={`${item.mediaType}-${item.id}`}
                    item={item}
                    listTypes={listTypes}
                    imageSizes="(max-width: 900px) 40vw, 180px"
                    onSelect={onSelect}
                    onChangeLists={onChangeLists}
                  />
                );
              })}
        </div>
      )}
    </section>
  );
}
