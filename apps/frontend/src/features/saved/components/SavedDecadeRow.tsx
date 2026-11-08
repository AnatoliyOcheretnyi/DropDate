"use client";

import type { Decade } from "../../../shared/lib/decades";

type Props = {
  facets: { decade: Decade; count: number }[];
  selected: string[];
  onToggle: (id: string) => void;
};

/**
 * Decade chips for the active list. Same OR semantics and list-scoped counts as
 * the genre row, and the row is absent when everything sits in one decade —
 * a filter that cannot narrow anything is noise.
 */
export function SavedDecadeRow({ facets, selected, onToggle }: Props) {
  if (facets.length < 2) {
    return null;
  }

  return (
    <div className="saved-panel-row saved-panel-row--decades">
      <span className="saved-panel-label">Роки</span>
      <div className="saved-genre-chips">
        {facets.map(({ decade, count }) => {
          const isSelected = selected.includes(decade.id);
          return (
            <button
              key={decade.id}
              type="button"
              className={`saved-genre${isSelected ? " is-active" : ""}`}
              aria-pressed={isSelected}
              onClick={() => onToggle(decade.id)}
            >
              <span>{decade.label}</span>
              <span className="saved-genre-count">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
