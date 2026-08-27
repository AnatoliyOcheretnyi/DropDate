"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Suggestion } from "../shared/lib/release";
import { useSuggestions } from "../shared/hooks/useSuggestions";
import { useSavedReleases } from "../features/saved/hooks/useSavedReleases";
import { Icon } from "../shared/ui/Icon";
import { PeopleSuggestions } from "../shared/ui/PeopleSuggestions";
import { Suggestions } from "../shared/ui/Suggestions";

/**
 * The header's inline search field.
 *
 * Desktop only: on narrow screens the header keeps its icon button, which opens
 * the full-screen search overlay, and the bottom bar carries a search tab. CSS
 * decides which of the two is visible.
 */
export function HeaderSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const blurTimeout = useRef<number | null>(null);
  const { isSuggestionSaved } = useSavedReleases();

  const { suggestions, people } = useSuggestions(query, null, () => {});

  const close = () => {
    setIsOpen(false);
    setQuery("");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    close();
    router.push(`/search?query=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form className="header-search" onSubmit={handleSubmit} role="search">
      <Icon name="search" size={17} className="header-search__icon" />
      <input
        type="search"
        value={query}
        placeholder="Фільм, серіал, актор…"
        aria-label="Пошук"
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          // Let a click on a suggestion land before the list unmounts.
          blurTimeout.current = window.setTimeout(() => setIsOpen(false), 150);
        }}
      />
      {isOpen && (suggestions.length > 0 || people.length > 0) ? (
        <div className="search-results-stack header-search__results">
          {/* The placeholder promises actors, so people come first: typing a
              name should reach the person, not scroll past the titles. */}
          <PeopleSuggestions
            people={people}
            onSelect={(person) => {
              close();
              router.push(`/person/${person.id}`);
            }}
          />
          <Suggestions
            suggestions={suggestions}
            isSaved={isSuggestionSaved}
            onSelect={(suggestion: Suggestion) => {
              close();
              router.push(`/title/${suggestion.mediaType}/${suggestion.id}`);
            }}
          />
        </div>
      ) : null}
    </form>
  );
}
