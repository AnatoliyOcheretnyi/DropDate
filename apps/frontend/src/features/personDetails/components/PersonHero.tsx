"use client";

import { useMemo, useState } from "react";
import type { Person, PersonRole } from "../../../shared/lib/release";

type Props = {
  person: Person;
  activeRole: PersonRole;
  isAuthed: boolean;
  followState?: { subscribed?: boolean };
  onBack: () => void;
  onToggleLike: () => void;
  onToggleSubscribe: () => void;
};

const formatDate = (value?: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
};

const computeAge = (birthday?: string, deathday?: string) => {
  if (!birthday) return null;
  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) return null;
  const end = deathday ? new Date(deathday) : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const m = end.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
};

const roleLabel = (role: PersonRole) =>
  role === "director" ? "Режисер" : "Актор";

export function PersonHero({
  person,
  activeRole,
  isAuthed,
  followState,
  onBack,
  onToggleLike,
  onToggleSubscribe,
}: Props) {
  const [bioExpanded, setBioExpanded] = useState(false);

  const age = useMemo(
    () => computeAge(person.birthday, person.deathday),
    [person.birthday, person.deathday]
  );

  const liked = Boolean(followState);
  const subscribed = Boolean(followState?.subscribed);
  const roleWord = activeRole === "director" ? "режисера" : "актора";

  const bio = person.biography?.trim() || "";
  const isLongBio = bio.length > 360;
  const shownBio = bioExpanded || !isLongBio ? bio : `${bio.slice(0, 360)}…`;

  const links: { href: string; label: string }[] = [];
  if (person.instagram) {
    links.push({
      href: `https://instagram.com/${person.instagram}`,
      label: "Instagram",
    });
  }
  if (person.twitter) {
    links.push({ href: `https://x.com/${person.twitter}`, label: "X" });
  }
  if (person.imdbId) {
    links.push({
      href: `https://www.imdb.com/name/${person.imdbId}`,
      label: "IMDb",
    });
  }
  if (person.homepage) {
    links.push({ href: person.homepage, label: "Сайт" });
  }

  return (
    <section className="person-hero">
      <div className="person-hero__inner">
        <button type="button" className="details-back" onClick={onBack}>
          <span aria-hidden="true">←</span>
          Назад
        </button>

        <div className="person-hero__layout">
          <div className="person-hero__photo">
            {person.profileUrl ? (
              <img src={person.profileUrl} alt={person.name} />
            ) : (
              <span aria-hidden="true">{person.name.slice(0, 1)}</span>
            )}
          </div>

          <div className="person-hero__main">
            <span className="person-hero__role">{roleLabel(activeRole)}</span>
            <h1>{person.name}</h1>

            <div className="person-hero__facts">
              {person.birthday ? (
                <span>
                  {formatDate(person.birthday)}
                  {age !== null ? ` · ${age} р.` : ""}
                </span>
              ) : null}
              {person.placeOfBirth ? <span>{person.placeOfBirth}</span> : null}
              {person.knownForDepartment ? (
                <span>{person.knownForDepartment}</span>
              ) : null}
            </div>

            {isAuthed ? (
              <div className="person-hero__actions">
                <button
                  type="button"
                  className={`person-like${liked ? " is-active" : ""}`}
                  aria-pressed={liked}
                  onClick={onToggleLike}
                >
                  <span aria-hidden="true">{liked ? "♥" : "♡"}</span>
                  {liked ? "У колекції" : `Улюблений ${roleWord}`}
                </button>
                <button
                  type="button"
                  className={`person-subscribe${subscribed ? " is-active" : ""}`}
                  aria-pressed={subscribed}
                  onClick={onToggleSubscribe}
                  title={`Сповіщати про новинки цього ${roleWord}`}
                >
                  <span aria-hidden="true">🔔</span>
                  {subscribed ? "Стежу за новинками" : "Стежити за новинками"}
                </button>
              </div>
            ) : null}

            {bio ? (
              <p className="person-hero__bio">
                {shownBio}
                {isLongBio ? (
                  <button
                    type="button"
                    className="person-hero__bio-toggle"
                    onClick={() => setBioExpanded((prev) => !prev)}
                  >
                    {bioExpanded ? "Згорнути" : "Більше"}
                  </button>
                ) : null}
              </p>
            ) : null}

            {links.length ? (
              <div className="person-hero__links">
                {links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="person-hero__link"
                  >
                    {link.label}
                    <span aria-hidden="true">↗</span>
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
