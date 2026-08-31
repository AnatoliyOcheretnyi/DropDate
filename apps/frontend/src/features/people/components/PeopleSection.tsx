"use client";

import { useMemo, useState } from "react";
import { useFollowedPeople } from "../hooks/useFollowedPeople";
import { PersonFollowButton } from "./PersonFollowButton";
import type { FollowedPerson, PersonRole } from "../store/followedPeopleStore";
import { CoverImage } from "../../../shared/ui/CoverImage";

const ROLE_LABEL: Record<PersonRole, string> = {
  actor: "Актор",
  director: "Режисер",
};

type RoleFilter = PersonRole | "all";

const ROLE_FILTERS: { key: RoleFilter; label: string }[] = [
  { key: "all", label: "Усі" },
  { key: "actor", label: "Актори" },
  { key: "director", label: "Режисери" },
];

type Props = {
  /** Someone else's follows; omitted means "my own". */
  people?: FollowedPerson[];
  isLoading?: boolean;
  /** A friend's grid never unfollows on their behalf — it offers to follow too. */
  readOnly?: boolean;
  /** Whose grid this is, used in the empty states: "Марина ще ні за ким…". */
  ownerLabel?: string;
};

/**
 * The whole grid, with role filter and search — the profile used to show eight
 * chips and a "+N" that led to a different page to see the rest.
 */
export function PeopleSection({
  people: peopleProp,
  isLoading = false,
  readOnly = false,
  ownerLabel,
}: Props) {
  const { people: myPeople, removeFollow } = useFollowedPeople();
  const people = peopleProp ?? myPeople;
  const [role, setRole] = useState<RoleFilter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      all: people.length,
      actor: people.filter((person) => person.role === "actor").length,
      director: people.filter((person) => person.role === "director").length,
    }),
    [people]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return people.filter((person) => {
      if (role !== "all" && person.role !== role) {
        return false;
      }
      return needle ? person.name.toLowerCase().includes(needle) : true;
    });
  }, [people, query, role]);

  const owner = ownerLabel ?? "Ти";
  const emptyTitle =
    query.trim().length > 0
      ? "Нічого не знайшлось"
      : ownerLabel
        ? `${owner} ще ні за ким не стежить`
        : "Ти ще ні за ким не стежиш";
  const emptyHint =
    query.trim().length > 0
      ? "Спробуй іншу частину імені."
      : ownerLabel
        ? "Коли зʼявляться підписки на акторів чи режисерів, вони будуть тут."
        : "Відкрий сторінку актора чи режисера й познач улюбленим — щоб не пропустити нові релізи.";

  return (
    <div className="people-section">
      <div className="people-section__bar">
        <div className="people-toggle" role="tablist" aria-label="Тип персон">
          {ROLE_FILTERS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              role="tab"
              aria-selected={role === entry.key}
              className={`people-toggle__btn${role === entry.key ? " is-active" : ""}`}
              onClick={() => setRole(entry.key)}
            >
              {entry.label}
              <span>{counts[entry.key]}</span>
            </button>
          ))}
        </div>

        <label className="people-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path
              d="m20 20-3.6-3.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="search"
            value={query}
            placeholder={ownerLabel ? `Пошук серед людей ${owner}` : "Пошук серед своїх людей"}
            aria-label="Пошук серед людей"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      {isLoading ? (
        <div className="people-grid">
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <article key={key} className="person-card person-card--loading" aria-hidden="true" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="people-empty">
          <span aria-hidden="true">☆</span>
          <h3>{emptyTitle}</h3>
          <p>{emptyHint}</p>
        </div>
      ) : (
        <div className="people-grid">
          {filtered.map((person) => (
            <article key={`${person.tmdbId}:${person.role}`} className="person-card">
              <div className="person-card__photo">
                {person.profileUrl ? (
                  <CoverImage src={person.profileUrl} alt={person.name} sizes="160px" />
                ) : (
                  <span aria-hidden="true">{person.name.slice(0, 1)}</span>
                )}
              </div>
              <strong className="person-card__name">{person.name}</strong>
              <span className="person-card__role">{ROLE_LABEL[person.role]}</span>
              {readOnly ? (
                <PersonFollowButton
                  tmdbId={person.tmdbId}
                  name={person.name}
                  role={person.role}
                  profileUrl={person.profileUrl}
                  className="person-card__follow"
                  followLabel="Стежити теж"
                  followingLabel="Стежиш"
                />
              ) : (
                <button
                  type="button"
                  className="person-unfollow"
                  onClick={() => removeFollow(person.tmdbId, person.role)}
                >
                  Відписатись
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
