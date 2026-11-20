"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { LIST_META } from "../../../shared/lib/listMeta";
import type {
  GenreFacet,
  SavedSortDirection,
  SavedSortKey,
  SavedTabKey,
  SavedViewMode,
} from "../types";
import { SavedGenreRow } from "./SavedGenreRow";
import { SavedDecadeRow } from "./SavedDecadeRow";
import type { Decade } from "../../../shared/lib/decades";
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
  decadeFacets: { decade: Decade; count: number }[];
  selectedDecades: string[];
  onToggleDecade: (id: string) => void;
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
  /** Whose list is being narrowed — the friend page says so in the field. */
  searchPlaceholder?: string;
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
  decadeFacets,
  selectedDecades,
  onToggleDecade,
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
  searchPlaceholder = "Пошук у списку",
}: Props) {
  const slotRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const expandedAt = useRef<number | null>(null);
  const [stuck, setStuck] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [reservedHeight, setReservedHeight] = useState(0);
  const filtersId = useId();
  const compact = stuck && !expanded;

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const slot = slotRef.current;
      if (!slot) return;
      const top = parseFloat(getComputedStyle(slot).top) || 0;
      const next =
        window.scrollY > 0 && slot.getBoundingClientRect().top <= top + 1;
      setStuck(next);
      if (
        !next ||
        (expandedAt.current !== null &&
          Math.abs(window.scrollY - expandedAt.current) > 100)
      ) {
        setExpanded(false);
        expandedAt.current = null;
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  useLayoutEffect(() => {
    if (compact || !panelRef.current) return;
    const panel = panelRef.current;
    const measure = () =>
      setReservedHeight(panel.getBoundingClientRect().height);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [compact]);

  const activeLabel =
    tab === "all" ? "Усі" : LIST_META.find((item) => item.type === tab)?.label;
  const activeFilterCount = selectedGenres.length + selectedDecades.length;

  return (
    <div
      ref={slotRef}
      className="saved-panel-slot"
      style={{ minHeight: reservedHeight || undefined }}
    >
      <div
        ref={panelRef}
        className={`saved-panel${compact ? " saved-panel--compact" : ""}`}
      >
        <div id={filtersId} className="saved-panel-filters" hidden={compact}>
          <div
            className="saved-panel-row saved-panel-row--lists"
            role="tablist"
            aria-label="Списки"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "all"}
              className={`saved-list-pill${tab === "all" ? " is-active" : ""}`}
              onClick={() => onTabChange("all")}
            >
              <span className="saved-list-pill-icon">{allIcon}</span>
              <span>Усі</span>
              <span className="saved-list-pill-count">
                {tabCounts.all ?? 0}
              </span>
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

          <SavedDecadeRow
            facets={decadeFacets}
            selected={selectedDecades}
            onToggle={onToggleDecade}
          />
        </div>
        <div className="saved-panel-row saved-panel-row--controls">
          {stuck && (
            <button
              type="button"
              className="saved-panel-expand"
              aria-expanded={!compact}
              aria-controls={filtersId}
              onClick={() => {
                expandedAt.current = compact ? window.scrollY : null;
                setExpanded((value) => !value);
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 7h16M7 12h10M10 17h4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              {compact ? "Фільтри" : "Згорнути"}
              {activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
            </button>
          )}
          <span className="saved-result-count">
            {compact && (
              <span className="saved-compact-list">{activeLabel} · </span>
            )}
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
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
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
    </div>
  );
}
