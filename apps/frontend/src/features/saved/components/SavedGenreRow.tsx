"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GenreFacet } from "../types";
import { VISIBLE_GENRE_COUNT } from "../types";

type Props = {
  facets: GenreFacet[];
  selected: string[];
  onToggle: (genre: string) => void;
  onReset: () => void;
};

/**
 * Genre chips for the active list. Counts are list-scoped, selection is
 * multi-choice with OR semantics, and the row disappears entirely when the
 * library carries fewer than two genres — which is what every library looks
 * like until the genres backfill has run.
 */
export function SavedGenreRow({ facets, selected, onToggle, onReset }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  const visible = useMemo(() => {
    const head = facets.slice(0, VISIBLE_GENRE_COUNT);
    // A selected genre never hides behind "Ще N" — the user must see what is on.
    const pinned = facets.filter(
      (facet) => selected.includes(facet.genre) && !head.includes(facet)
    );
    return [...head, ...pinned];
  }, [facets, selected]);

  const hidden = useMemo(
    () => facets.filter((facet) => !visible.includes(facet)),
    [facets, visible]
  );

  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return hidden;
    }
    return hidden.filter((facet) => facet.genre.toLowerCase().includes(needle));
  }, [hidden, search]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  if (facets.length < 2) {
    return null;
  }

  return (
    <div className="saved-panel-row saved-panel-row--genres">
      <span className="saved-panel-label">Жанри</span>
      <div className="saved-genre-chips" ref={rootRef}>
        {visible.map((facet) => {
          const isSelected = selected.includes(facet.genre);
          return (
            <button
              key={facet.genre}
              type="button"
              className={`saved-genre${isSelected ? " is-active" : ""}`}
              aria-pressed={isSelected}
              onClick={() => onToggle(facet.genre)}
            >
              {isSelected ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="m5 13 4 4L19 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
              <span>{facet.genre}</span>
              <span className="saved-genre-count">{facet.count}</span>
            </button>
          );
        })}

        {hidden.length > 0 ? (
          <div className="saved-genre-more">
            <button
              type="button"
              className={`saved-genre saved-genre--more${isOpen ? " is-open" : ""}`}
              onClick={() => setIsOpen((prev) => !prev)}
              aria-expanded={isOpen}
            >
              <span>Ще {hidden.length}</span>
              <span aria-hidden="true">▾</span>
            </button>

            {isOpen ? (
              <div className="saved-dropdown saved-dropdown--genres">
                <input
                  type="search"
                  className="saved-dropdown-search"
                  placeholder="Пошук жанру"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <div className="saved-dropdown-list">
                  {matches.length === 0 ? (
                    <p className="saved-dropdown-empty">Нічого не знайшлось</p>
                  ) : (
                    matches.map((facet) => {
                      const isSelected = selected.includes(facet.genre);
                      return (
                        <label key={facet.genre} className="saved-dropdown-check">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggle(facet.genre)}
                          />
                          <span>{facet.genre}</span>
                          <span className="saved-genre-count">{facet.count}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                <div className="saved-dropdown-split" />
                <div className="saved-dropdown-foot">
                  <button type="button" onClick={onReset}>
                    Скинути
                  </button>
                  <button
                    type="button"
                    className="is-primary"
                    onClick={() => setIsOpen(false)}
                  >
                    Готово
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
