"use client";

import type { ReactNode } from "react";

type Props = {
  initials: string;
  /** Rendered as-is: `@username` on a profile, a display name elsewhere. */
  title: string;
  meta: (string | null | undefined)[];
  action?: ReactNode;
  /** A friend's avatar is neutral, so the mint accent stays "this is you". */
  tone?: "accent" | "neutral";
};

/**
 * One identity block for both profiles. The old screen drew the same avatar,
 * email and heading twice — a hero copy plus a ProfileCard — with the username
 * shown in neither.
 */
export function IdentityHeader({ initials, title, meta, action, tone = "accent" }: Props) {
  const parts = meta.filter((entry): entry is string => Boolean(entry));

  return (
    <section className={`identity-header identity-header--${tone}`}>
      <span className="identity-header__ring" aria-hidden="true" />
      <div className="identity-header__id">
        <span className="identity-header__avatar" aria-hidden="true">
          {initials}
        </span>
        <div className="identity-header__text">
          <h1>{title}</h1>
          {parts.length > 0 ? (
            <p className="identity-header__meta">
              {parts.map((entry, index) => (
                <span key={entry}>
                  {index > 0 ? <i aria-hidden="true" /> : null}
                  {entry}
                </span>
              ))}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="identity-header__action">{action}</div> : null}
    </section>
  );
}
