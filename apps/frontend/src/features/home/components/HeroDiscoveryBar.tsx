"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../../../shared/ui/Icon";
import { EXAMPLE_PHRASES } from "../../vibe/types";

/**
 * The hero's search bar — the associative one.
 *
 * It used to search titles, which is what the header field already does; the
 * placeholder promised a description and the Enter key delivered a title
 * search. Now the phrase goes to /vibe, and titles stay with the header. The
 * three shortcuts that lived here ("Здивуй мене", "Кіно-баттл", "За настроєм")
 * moved out entirely: all three sit one screen below in "Відкрий щось нове".
 *
 * Focus changes nothing on purpose — no panel, no suggestions. The examples
 * under the field are always there, so there is nothing left for a dropdown to
 * add, and a hero that reflows the moment it is clicked reads as a glitch.
 */
export function HeroDiscoveryBar() {
  const router = useRouter();
  const [phrase, setPhrase] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ⌘K / Ctrl+K focuses the bar from anywhere on the page.
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

  const open = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 3) {
      return;
    }
    router.push(`/vibe?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="hero-discovery">
      <form
        className="hero-discovery__form"
        onSubmit={(event) => {
          event.preventDefault();
          open(phrase);
        }}
        role="search"
      >
        <Icon name="sparkles" size={20} className="hero-discovery__icon" />
        <input
          ref={inputRef}
          type="text"
          value={phrase}
          placeholder="молодіжний жах, де багато крові…"
          aria-label="Опиши, що хочеш подивитись"
          onChange={(event) => setPhrase(event.target.value)}
        />
        <button
          type="submit"
          className="hero-discovery__submit"
          disabled={phrase.trim().length < 3}
        >
          Знайти
        </button>
      </form>

      <div className="hero-discovery__examples">
        <span className="hero-discovery__examples-label">Спробуй</span>
        {EXAMPLE_PHRASES.map((example) => (
          <button
            key={example}
            type="button"
            className="hero-discovery__example"
            onClick={() => open(example)}
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
