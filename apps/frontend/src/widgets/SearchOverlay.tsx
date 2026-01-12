"use client";

import { useEffect, useRef } from "react";
import type { Suggestion } from "../../lib/release";
import { copy } from "../../lib/strings";
import { Suggestions } from "../shared/ui/Suggestions";

type Props = {
  title: string;
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  suggestions: Suggestion[];
  isFetchingSuggestions: boolean;
  onSuggestionSelect: (suggestion: Suggestion) => void;
  isSuggestionSaved: (suggestion: Suggestion) => boolean;
};

export function SearchOverlay({
  title,
  isLoading,
  isOpen,
  onClose,
  onChange,
  onSubmit,
  onFocus,
  onBlur,
  suggestions,
  isFetchingSuggestions,
  onSuggestionSelect,
  isSuggestionSaved,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("no-scroll");
      return () => {
        document.body.classList.remove("no-scroll");
      };
    }
    document.body.classList.remove("no-scroll");
    return undefined;
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="search-backdrop"
        aria-label={copy.header.searchCloseLabel}
        onClick={onClose}
      />
      <form className="search-overlay" onSubmit={onSubmit} role="dialog" aria-modal="true">
        <div className="search-overlay-row">
          <div className="search-overlay-field">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0-2a9 9 0 1 0 5.66 15.99l4.68 4.68 1.41-1.41-4.68-4.68A9 9 0 0 0 11 2Z"
                fill="currentColor"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder={copy.header.searchPlaceholder}
              value={title}
              onChange={(event) => onChange(event.target.value)}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
          <button
            type="button"
            className="search-overlay-close"
            aria-label={copy.header.searchCloseLabel}
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6 6.4 5Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <button
            type="submit"
            className="search-overlay-submit"
            disabled={isLoading || title.trim().length === 0}
          >
            {isLoading ? copy.header.searchBusy : copy.header.searchSubmit}
          </button>
        </div>
        {isFetchingSuggestions && <p className="hint">{copy.header.suggestionsLoading}</p>}
        {suggestions.length > 0 && (
          <Suggestions
            suggestions={suggestions}
            isSaved={isSuggestionSaved}
            onSelect={onSuggestionSelect}
          />
        )}
      </form>
    </>
  );
}
