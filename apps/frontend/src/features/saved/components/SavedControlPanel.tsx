"use client";

import { LIST_META } from "../../../shared/lib/listMeta";
import type { GenreFacet, SavedSortDirection, SavedSortKey, SavedTabKey, SavedViewMode } from "../types";
import { SavedGenreRow } from "./SavedGenreRow";
import { SavedSortMenu } from "./SavedSortMenu";

const allIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z"
      fill="currentColor"
    />
  </svg>
);

type Props = {
  tab: SavedTabKey;
  tabCounts: Record<SavedTabKey, number>;
  onTabChange: (tab: SavedTabKey) => void;
  isAuthenticated: boolean;
  genreFacets: GenreFacet[];
  selectedGenres: string[];
  onToggleGenre: (genre: string) => void;
  onResetGenres: () => void;
  query: string;
  onQueryChange: (value: string) => void;
  sortKey: SavedSortKey;
  direction: SavedSortDirection;
  onSortChange: (key: SavedSortKey) => void;
  onToggleDirection: () => void;
  view: SavedViewMode;
  onViewChange: (view: SavedViewMode) => void;
  shownCount: number;
  totalCount: number;
  isFiltered: boolean;
};

const titleWord = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return "тайтл";
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "тайтли";
  }
  return "тайтлів";
};

/**
 * One sticky panel instead of three scattered levels (tabs → stat tiles →
 * a separate sort row). Order matches how the list is narrowed down:
 * which list → which genres → how it is searched, sorted and displayed.
 */
export function SavedControlPanel({
  tab,
  tabCounts,
  onTabChange,
  isAuthenticated,
  genreFacets,
  selectedGenres,
  onToggleGenre,
  onResetGenres,
  query,
  onQueryChange,
  sortKey,
  direction,
  onSortChange,
  onToggleDirection,
  view,
  onViewChange,
  shownCount,
  totalCount,
  isFiltered,
}: Props) {
  return (
    <div className="saved-panel">
      <div className="saved-panel-row saved-panel-row--lists" role="tablist" aria-label="Списки">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "all"}
          className={`saved-list-pill${tab === "all" ? " is-active" : ""}`}
          onClick={() => onTabChange("all")}
        >
          <span className="saved-list-pill-icon">{allIcon}</span>
          <span>Усі</span>
          <span className="saved-list-pill-count">{tabCounts.all ?? 0}</span>
        </button>

        {LIST_META.map((meta) => {
          const isDisabled = !isAuthenticated && meta.type !== "follow";
          return (
            <button
              key={meta.type}
              type="button"
              role="tab"
              aria-selected={tab === meta.type}
              className={`saved-list-pill${tab === meta.type ? " is-active" : ""}`}
              onClick={() => onTabChange(meta.type)}
              disabled={isDisabled}
            >
              <span className="saved-list-pill-icon">{meta.icon}</span>
              <span>{meta.label}</span>
              <span className="saved-list-pill-count">
                {tabCounts[meta.type] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <SavedGenreRow
        facets={genreFacets}
        selected={selectedGenres}
        onToggle={onToggleGenre}
        onReset={onResetGenres}
      />

      <div className="saved-panel-row saved-panel-row--controls">
        <span className="saved-result-count">
          {isFiltered
            ? `Показано ${shownCount} з ${totalCount}`
            : `${totalCount} ${titleWord(totalCount)}`}
        </span>

        <div className="saved-controls-group">
          <label className="saved-search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle
                cx="11"
                cy="11"
                r="7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="m20 20-3.6-3.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              value={query}
              placeholder="Пошук у списку"
              aria-label="Пошук у списку"
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </label>

          <SavedSortMenu
            sortKey={sortKey}
            direction={direction}
            onChange={onSortChange}
            onToggleDirection={onToggleDirection}
          />

          <div className="saved-view-toggle" role="group" aria-label="Вигляд">
            <button
              type="button"
              className={view === "grid" ? "is-active" : ""}
              aria-pressed={view === "grid"}
              aria-label="Сітка"
              onClick={() => onViewChange("grid")}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <button
              type="button"
              className={view === "compact" ? "is-active" : ""}
              aria-pressed={view === "compact"}
              aria-label="Списком"
              onClick={() => onViewChange("compact")}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 5h16v3H4V5Zm0 5.5h16v3H4v-3ZM4 16h16v3H4v-3Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
