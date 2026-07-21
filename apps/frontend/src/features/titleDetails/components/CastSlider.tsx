"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import type { CastMember } from "../../../shared/lib/release";
import { CoverImage } from "../../../shared/ui/CoverImage";

type Props = {
  cast: CastMember[];
};

export function CastSlider({ cast }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  if (!cast || cast.length === 0) {
    return null;
  }

  const scrollBy = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) {
      return;
    }
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="details-cast details-section">
      <div className="details-section-head details-cast-head">
        <div>
          <p className="eyebrow">У ролях</p>
          <h2>Актори</h2>
        </div>
        <div className="cast-nav">
          <button
            type="button"
            className="cast-nav__btn"
            onClick={() => scrollBy(-1)}
            aria-label="Прокрутити назад"
          >
            ‹
          </button>
          <button
            type="button"
            className="cast-nav__btn"
            onClick={() => scrollBy(1)}
            aria-label="Прокрутити вперед"
          >
            ›
          </button>
        </div>
      </div>
      <div className="cast-viewport">
        <div className="cast-slider" ref={scrollerRef}>
          {cast.map((member, index) => (
            <button
              type="button"
              key={member.tmdbId}
              className="cast-card cast-card--link"
              style={{ ["--card-index" as string]: index }}
              onClick={() =>
                router.push(`/person/${member.tmdbId}?role=actor`)
              }
              title={member.name}
            >
              <div className="cast-card-photo">
                {member.profileUrl ? (
                  <CoverImage src={member.profileUrl} alt={member.name} sizes="150px" />
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
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
