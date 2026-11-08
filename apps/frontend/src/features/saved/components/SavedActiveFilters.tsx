"use client";

import { SAVED_SORT_LABELS } from "../types";
import type { SavedSortDirection, SavedSortKey } from "../types";
import { decadeById } from "../../../shared/lib/decades";

type Props = {
  genres: string[];
  decades: string[];
  query: string;
  sortKey: SavedSortKey;
  direction: SavedSortDirection;
  isSortPinned: boolean;
  onRemoveGenre: (genre: string) => void;
  onRemoveDecade: (id: string) => void;
  onClearQuery: () => void;
  onReset: () => void;
};

/**
 * Only rendered when there is something to clear. Without it a filtered list
 * looks identical to an empty one.
 */
export function SavedActiveFilters({
  genres,
  decades,
  query,
  sortKey,
  direction,
  isSortPinned,
  onRemoveGenre,
  onRemoveDecade,
  onClearQuery,
  onReset,
}: Props) {
  const trimmedQuery = query.trim();
  if (
    genres.length === 0 &&
    decades.length === 0 &&
    !trimmedQuery &&
    !isSortPinned
  ) {
    return null;
  }

  return (
    <div className="saved-active-filters">
      <div className="saved-active-chips">
        {genres.map((genre) => (
          <button
            key={genre}
            type="button"
            className="saved-active-chip"
            onClick={() => onRemoveGenre(genre)}
          >
            {genre}
            <span aria-hidden="true">✕</span>
          </button>
        ))}
        {decades.map((id) => (
          <button
            key={id}
            type="button"
            className="saved-active-chip"
            onClick={() => onRemoveDecade(id)}
          >
            {decadeById(id)?.label ?? id}
            <span aria-hidden="true">✕</span>
          </button>
        ))}
        {trimmedQuery ? (
          <button
            type="button"
            className="saved-active-chip"
            onClick={onClearQuery}
          >
            «{trimmedQuery}»<span aria-hidden="true">✕</span>
          </button>
        ) : null}
        {isSortPinned ? (
          <span className="saved-active-chip is-static">
            {SAVED_SORT_LABELS[sortKey]} {direction === "desc" ? "↓" : "↑"}
          </span>
        ) : null}
      </div>
      <button type="button" className="saved-reset" onClick={onReset}>
        Скинути все
      </button>
    </div>
  );
}
