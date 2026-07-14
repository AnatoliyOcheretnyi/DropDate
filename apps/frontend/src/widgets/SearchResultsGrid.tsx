"use client";

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
  showEmpty?: boolean;
};

export function SearchResultsGrid({
  items,
  isLoading,
  onSelect,
  getListTypes,
  onChangeLists,
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
