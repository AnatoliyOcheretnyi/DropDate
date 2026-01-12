"use client";

import type { Suggestion } from "../../../lib/release";
import { copy } from "../../../lib/strings";

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
            <div className="suggestion-poster" aria-hidden>
              {suggestion.posterUrl ? (
                <img src={suggestion.posterUrl} alt="" loading="lazy" />
              ) : (
                <div className="suggestion-poster-fallback" />
              )}
            </div>
            <div className="suggestion-content">
              <p className="suggestion-title">{suggestion.title}</p>
              <div className="suggestion-meta-row">
                <p className="suggestion-meta">
                  {suggestion.mediaType === "movie"
                    ? copy.mediaType.movie
                    : copy.mediaType.series}
                  {suggestion.year ? ` · ${suggestion.year}` : ""}
                </p>
                {isSaved(suggestion) && (
                  <span className="saved-pill">{copy.actions.inList}</span>
                )}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
