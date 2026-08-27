"use client";

import { useRouter } from "next/navigation";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { personRoleLabel } from "../../../shared/lib/personRoles";
import type { PersonMatch } from "../types";

type Props = {
  people: PersonMatch[];
};

/**
 * People matched by the query. Shown above the title results because when the
 * query is a name, the title list is usually near-empty — the films the user
 * wants hang off the person, not off the name.
 */
export function SearchPeopleStrip({ people }: Props) {
  const router = useRouter();

  if (people.length === 0) {
    return null;
  }

  return (
    <section className="search-people">
      <div className="search-people-head">
        <h2>Люди</h2>
        <span>{people.length}</span>
      </div>
      <div className="search-people-row">
        {people.map((person) => (
          <button
            key={person.id}
            type="button"
            className="search-person"
            onClick={() => router.push(`/person/${person.id}`)}
          >
            <span className="search-person-photo">
              {person.profileUrl ? (
                <CoverImage
                  src={person.profileUrl}
                  alt={person.name}
                  sizes="72px"
                />
              ) : (
                <span className="search-person-fallback" aria-hidden="true">
                  {person.name.slice(0, 1)}
                </span>
              )}
            </span>
            <span className="search-person-body">
              <span className="search-person-name">{person.name}</span>
              <span className="search-person-meta">
                {[personRoleLabel(person), person.knownFor?.[0]?.title]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
