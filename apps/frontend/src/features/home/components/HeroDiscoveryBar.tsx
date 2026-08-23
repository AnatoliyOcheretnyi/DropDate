"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Suggestion } from "../../../shared/lib/release";
import { useSuggestions } from "../../../shared/hooks/useSuggestions";
import { Icon } from "../../../shared/ui/Icon";
import { Suggestions } from "../../../shared/ui/Suggestions";

type Props = {
  /** Pool the "surprise me" die rolls from -- whatever the page already loaded. */
  surprisePool: Suggestion[];
  isSuggestionSaved: (suggestion: Suggestion) => boolean;
};

const PLACEHOLDER =
  "Опиши, чого хочеш: «корейський трилер до 100 хв» або «щось нове, як Дюна»";

export function HeroDiscoveryBar({ surprisePool, isSuggestionSaved }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurTimeout = useRef<number | null>(null);

  const { suggestions } = useSuggestions(query, null, () => {});

  // ⌘K / Ctrl+K focuses the bar from anywhere on the page, matching the hint
  // rendered inside it.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(
    () => () => {
      if (blurTimeout.current !== null) {
        window.clearTimeout(blurTimeout.current);
      }
    },
    []
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    setIsOpen(false);
    router.push(`/search?query=${encodeURIComponent(trimmed)}`);
  };

  const handleSelect = (suggestion: Suggestion) => {
    setIsOpen(false);
    router.push(`/title/${suggestion.mediaType}/${suggestion.id}`);
  };

  const handleSurprise = () => {
    if (surprisePool.length === 0) {
      router.push("/mood");
      return;
    }
    const pick = surprisePool[Math.floor(Math.random() * surprisePool.length)];
    router.push(`/title/${pick.mediaType}/${pick.id}`);
  };

  const showSuggestions = isOpen && suggestions.length > 0;

  return (
    <div className="hero-discovery">
      <form className="hero-discovery__search" onSubmit={handleSubmit} role="search">
        <Icon name="search" size={20} className="hero-discovery__search-icon" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder={PLACEHOLDER}
          aria-label="Пошук фільмів і серіалів"
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
        <kbd className="hero-discovery__shortcut" aria-hidden="true">
          ⌘K
        </kbd>

        {/* Suggestions positions itself against this form, which is the nearest
            positioned ancestor -- no wrapper, or it would clip the list. */}
        {showSuggestions ? (
          <Suggestions
            suggestions={suggestions}
            isSaved={isSuggestionSaved}
            onSelect={handleSelect}
          />
        ) : null}
      </form>

      <span className="hero-discovery__divider" aria-hidden="true" />

      <div className="hero-discovery__actions">
        <button
          type="button"
          className="hero-discovery__action hero-discovery__action--primary"
          onClick={handleSurprise}
        >
          <Icon name="dices" size={17} />
          <span>Здивуй мене</span>
        </button>
        <button
          type="button"
          className="hero-discovery__action"
          onClick={() => router.push("/mood")}
        >
          <Icon name="sparkles" size={17} />
          <span>За настроєм</span>
        </button>
        <button
          type="button"
          className="hero-discovery__action"
          onClick={() => router.push("/games/battle")}
        >
          <Icon name="swords" size={17} />
          <span>Кіно-баттл</span>
        </button>
      </div>
    </div>
  );
}
