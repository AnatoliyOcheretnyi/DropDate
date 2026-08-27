"use client";

import type { PersonMatch } from "../../features/search/types";
import { personRoleLabel } from "../lib/personRoles";
import { CoverImage } from "./CoverImage";

type Props = {
  people: PersonMatch[];
  onSelect: (person: PersonMatch) => void;
};

export function PeopleSuggestions({ people, onSelect }: Props) {
  if (people.length === 0) {
    return null;
  }

  return (
    <div className="people-suggestions">
      <p className="people-suggestions-label">Люди</p>
      <ul className="suggestions suggestions--people">
        {people.map((person) => (
          <li key={person.id}>
            <button type="button" onClick={() => onSelect(person)}>
              <div className="suggestion-poster suggestion-poster--person" aria-hidden>
                {person.profileUrl ? (
                  <CoverImage src={person.profileUrl} alt="" sizes="56px" ariaHidden />
                ) : (
                  <div className="suggestion-poster-fallback" />
                )}
              </div>
              <div className="suggestion-content">
                <p className="suggestion-title">{person.name}</p>
                <div className="suggestion-meta-row">
                  <p className="suggestion-meta">
                    {[personRoleLabel(person), person.knownFor?.[0]?.title]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
