"use client";

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
  onSearchChange,
  onSearchSubmit,
  onSearchFocus,
  onSearchBlur,
  suggestions,
  isFetchingSuggestions,
  onSuggestionSelect,
  isSuggestionSaved,
}: Props) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <button type="button" className="header-brand" onClick={() => onChange("home")}>
          <img src="/logo.png" alt="DropDate" className="brand-logo" />
          <div className="brand-text">
            <span className="brand-title">DropDate</span>
            <span className="brand-subtitle">Дата наступного релізу в один клік</span>
          </div>
        </button>
        <div className="header-actions">
          <form
            className={`header-search${isSearchOpen ? " open" : ""}`}
            onSubmit={onSearchSubmit}
          >
            <input
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
              aria-label="Пошук"
              onClick={onSearchToggle}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0-2a9 9 0 1 0 5.66 15.99l4.68 4.68 1.41-1.41-4.68-4.68A9 9 0 0 0 11 2Z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <button type="submit" className="header-submit" disabled={isLoading}>
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
