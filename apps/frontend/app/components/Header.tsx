"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { Suggestion } from "../../lib/release";
import { Suggestions } from "./Suggestions";

type ViewKey = "home" | "saved";

type Props = {
  active: ViewKey;
  savedCount: number;
  onChange: (view: ViewKey) => void;
  title: string;
  isLoading: boolean;
  isSearchOpen: boolean;
  onSearchToggle: () => void;
  onSearchClose: () => void;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  suggestions: Suggestion[];
  isFetchingSuggestions: boolean;
  onSuggestionSelect: (suggestion: Suggestion) => void;
  isSuggestionSaved: (suggestion: Suggestion) => boolean;
};

export function Header({
  active,
  savedCount,
  onChange,
  title,
  isLoading,
  isSearchOpen,
  onSearchToggle,
  onSearchClose,
  onSearchChange,
  onSearchSubmit,
  onSearchFocus,
  onSearchBlur,
  suggestions,
  isFetchingSuggestions,
  onSuggestionSelect,
  isSuggestionSaved,
}: Props) {
  const searchRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    const handleClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) {
        onSearchClose();
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, [isSearchOpen, onSearchClose]);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <button type="button" className="header-brand" onClick={() => onChange("home")}>
          <Image
            src="/logo.png"
            alt="DropDate"
            className="brand-logo"
            width={80}
            height={80}
            priority
          />
          <div className="brand-text">
            <span className="brand-title">DropDate</span>
            <span className="brand-subtitle">Дата наступного релізу в один клік</span>
          </div>
        </button>
        <div className="header-actions">
          <form
            ref={searchRef}
            className={`header-search${isSearchOpen ? " open" : ""}`}
            onSubmit={onSearchSubmit}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Пошук..."
              value={title}
              onChange={(event) => onSearchChange(event.target.value)}
              onFocus={onSearchFocus}
              onBlur={onSearchBlur}
            />
            <button
              type="button"
              className="header-icon"
              aria-label={isSearchOpen ? "Закрити пошук" : "Пошук"}
              onClick={isSearchOpen ? onSearchClose : onSearchToggle}
            >
              {isSearchOpen ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6 6.4 5Z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0-2a9 9 0 1 0 5.66 15.99l4.68 4.68 1.41-1.41-4.68-4.68A9 9 0 0 0 11 2Z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </button>
            <button
              type="submit"
              className="header-submit"
              disabled={isLoading || title.trim().length === 0}
            >
              {isLoading ? "..." : "Знайти"}
            </button>
            {isSearchOpen && (
              <div className="header-autocomplete">
                {isFetchingSuggestions && (
                  <p className="hint">Підбираємо варіанти…</p>
                )}
                {suggestions.length > 0 && (
                  <Suggestions
                    suggestions={suggestions}
                    isSaved={isSuggestionSaved}
                    onSelect={onSuggestionSelect}
                  />
                )}
              </div>
            )}
          </form>
          <button
            type="button"
            className={`header-link${active === "saved" ? " active" : ""}`}
            onClick={() => onChange("saved")}
          >
            Мій список ({savedCount})
          </button>
        </div>
      </div>
    </header>
  );
}
