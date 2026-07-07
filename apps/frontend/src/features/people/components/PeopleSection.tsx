"use client";

import { useState } from "react";
import { useFollowedPeople } from "../hooks/useFollowedPeople";
import type { PersonRole } from "../store/followedPeopleStore";

const ROLE_LABEL: Record<PersonRole, string> = {
  actor: "Актор",
  director: "Режисер",
};

export function PeopleSection() {
  const { people, remove } = useFollowedPeople();
  const [role, setRole] = useState<PersonRole>("actor");
  const filtered = people.filter((person) => person.role === role);

  return (
    <div className="people-section">
      <div className="people-toggle" role="tablist" aria-label="Тип персон">
        <button
          type="button"
          role="tab"
          aria-selected={role === "actor"}
          className={`people-toggle__btn${role === "actor" ? " is-active" : ""}`}
          onClick={() => setRole("actor")}
        >
          Актори
          <span>{people.filter((p) => p.role === "actor").length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={role === "director"}
          className={`people-toggle__btn${
            role === "director" ? " is-active" : ""
          }`}
          onClick={() => setRole("director")}
        >
          Режисери
          <span>{people.filter((p) => p.role === "director").length}</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="people-empty">
          <span aria-hidden="true">☆</span>
          <h3>
            {role === "actor"
              ? "Ти ще ні за ким не стежиш"
              : "Режисерів поки немає"}
          </h3>
          <p>
            {role === "actor"
              ? "Відкрий сторінку фільму й натисни «Стежити» у розділі акторів — щоб не пропустити їхні нові релізи."
              : "Стеження за режисерами додамо разом із даними знімальної групи."}
          </p>
        </div>
      ) : (
        <div className="people-grid">
          {filtered.map((person) => (
            <article key={person.tmdbId} className="person-card">
              <div className="person-card__photo">
                {person.profileUrl ? (
                  <img
                    src={person.profileUrl}
                    alt={person.name}
                    loading="lazy"
                  />
                ) : (
                  <span aria-hidden="true">{person.name.slice(0, 1)}</span>
                )}
              </div>
              <strong className="person-card__name">{person.name}</strong>
              <span className="person-card__role">{ROLE_LABEL[person.role]}</span>
              <span className="person-card__badge">0 нових релізів</span>
              <button
                type="button"
                className="person-unfollow"
                onClick={() => remove(person.tmdbId)}
              >
                Відписатись
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
