"use client";

import type { CastMember } from "../../../shared/lib/release";

type Props = {
  cast: CastMember[];
};

export function CastSlider({ cast }: Props) {
  if (!cast || cast.length === 0) {
    return null;
  }

  return (
    <section className="details-cast details-section">
      <div className="details-section-head">
        <p className="eyebrow">У ролях</p>
        <h2>Актори</h2>
      </div>
      <div className="cast-slider">
        {cast.map((member) => (
          <article key={member.tmdbId} className="cast-card">
            <div className="cast-card-photo">
              {member.profileUrl ? (
                <img src={member.profileUrl} alt={member.name} loading="lazy" />
              ) : (
                <span className="cast-card-fallback" aria-hidden="true">
                  {member.name.slice(0, 1)}
                </span>
              )}
            </div>
            <strong className="cast-card-name">{member.name}</strong>
            {member.character ? (
              <span className="cast-card-character">{member.character}</span>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
