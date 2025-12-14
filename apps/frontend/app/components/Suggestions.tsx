"use client";

import type { Suggestion } from "../../lib/release";

type Props = {
  suggestions: Suggestion[];
  isSaved: (suggestion: Suggestion) => boolean;
  onSelect: (suggestion: Suggestion) => void;
};

export function Suggestions({ suggestions, isSaved, onSelect }: Props) {
  if (suggestions.length === 0) {
    return null;
  }
  return (
    <ul className="suggestions">
      {suggestions.map((suggestion) => (
        <li key={`${suggestion.mediaType}-${suggestion.id}`}>
          <button type="button" onClick={() => onSelect(suggestion)}>
            <p className="suggestion-title">{suggestion.title}</p>
            <div className="suggestion-meta-row">
              <p className="suggestion-meta">
                {suggestion.mediaType === "movie" ? "Фільм" : "Серіал"}
                {suggestion.year ? ` · ${suggestion.year}` : ""}
              </p>
              {isSaved(suggestion) && <span className="saved-pill">У списку</span>}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
