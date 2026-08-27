"use client";

import { useEffect, useRef, useState } from "react";
import type { SavedSortDirection, SavedSortKey } from "../types";
import { SAVED_SORT_LABELS } from "../types";

const SORT_ORDER: SavedSortKey[] = [
  "userRating",
  "tmdbRating",
  "release",
  "added",
  "alpha",
];

type Props = {
  sortKey: SavedSortKey;
  direction: SavedSortDirection;
  onChange: (key: SavedSortKey) => void;
  onToggleDirection: () => void;
};

/**
 * Sorting used to hide inside a native `<select>` that only appeared on some
 * tabs. It is now a first-class control: same on every tab, with the rating
 * keys split into "mine" and "TMDB" and an explicit direction toggle.
 */
export function SavedSortMenu({
  sortKey,
  direction,
  onChange,
  onToggleDirection,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="saved-sort" ref={rootRef}>
      <button
        type="button"
        className={`saved-sort-btn${isOpen ? " is-open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M7 4v14m0 0-3-3m3 3 3-3M17 20V6m0 0-3 3m3-3 3 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{SAVED_SORT_LABELS[sortKey]}</span>
        <span className="saved-sort-dir" aria-hidden="true">
          {direction === "desc" ? "↓" : "↑"}
        </span>
      </button>

      {isOpen ? (
        <div className="saved-dropdown saved-dropdown--sort" role="menu">
          {SORT_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              role="menuitemradio"
              aria-checked={key === sortKey}
              className={`saved-dropdown-option${key === sortKey ? " is-active" : ""}`}
              onClick={() => {
                onChange(key);
                setIsOpen(false);
              }}
            >
              <span>{SAVED_SORT_LABELS[key]}</span>
              {key === sortKey ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="m5 13 4 4L19 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </button>
          ))}

          <div className="saved-dropdown-split" />

          <div className="saved-dropdown-direction">
            <button
              type="button"
              className={direction === "desc" ? "is-active" : ""}
              onClick={() => {
                if (direction !== "desc") {
                  onToggleDirection();
                }
              }}
            >
              ↓ Спадання
            </button>
            <button
              type="button"
              className={direction === "asc" ? "is-active" : ""}
              onClick={() => {
                if (direction !== "asc") {
                  onToggleDirection();
                }
              }}
            >
              ↑ Зростання
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
