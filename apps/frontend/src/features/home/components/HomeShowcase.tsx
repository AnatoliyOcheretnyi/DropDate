"use client";

import { useEffect, useState } from "react";
import type { Suggestion } from "../../../shared/lib/release";
import { copy } from "../../../shared/lib/strings";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { MovieInfoButton } from "../../../shared/ui/MovieInfoButton";

type Props = {
  spotlightItems: Suggestion[];
  supportingItems: Suggestion[];
  onSearchOpen: () => void;
  onSelect: (suggestion: Suggestion) => void;
};

const ROTATE_MS = 6000;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function HomeShowcase({
  spotlightItems,
  supportingItems,
  onSearchOpen,
  onSelect,
}: Props) {
  const [active, setActive] = useState(0);
  const count = spotlightItems.length;

  useEffect(() => {
    if (count <= 1 || prefersReducedMotion()) {
      return;
    }
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % count);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [count]);

  useEffect(() => {
    if (active >= count && count > 0) {
      setActive(0);
    }
  }, [active, count]);

  return (
    <section className="home-showcase hero-bleed">
      <div className="home-showcase-inner">
        <div className="home-showcase-head">
          <div>
            <p className="eyebrow">Зараз на радарі</p>
            <h1>Нові релізи</h1>
          </div>
          <button type="button" className="primary" onClick={onSearchOpen}>
            Знайти фільм
          </button>
        </div>

        <div className="home-showcase-grid">
          <div className="showcase-feature-stack">
            {spotlightItems.map((item, index) => {
              const isActive = index === active;
              return (
                <button
                  key={`${item.mediaType}-${item.id}`}
                  type="button"
                  className={`showcase-feature${isActive ? " is-active" : ""}`}
                  onClick={() => onSelect(item)}
                  aria-hidden={!isActive}
                  tabIndex={isActive ? 0 : -1}
                >
                  <div className="showcase-feature__media">
                    {item.posterUrl ? (
                      <CoverImage
                        src={item.posterUrl}
                        alt={item.title}
                        sizes="(max-width: 900px) 100vw, 36vw"
                        priority={index === 0}
                      />
                    ) : (
                      <div className="showcase-feature__fallback">
                        {item.title.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="showcase-feature__shade" />
                  <div className="showcase-feature__content">
                    <span>Головна премʼєра</span>
                    <strong>{item.title}</strong>
                    <small>
                      {item.mediaType === "movie"
                        ? copy.mediaType.movie
                        : copy.mediaType.series}
                      {item.year ? ` · ${item.year}` : ""}
                    </small>
                  </div>
                </button>
              );
            })}

            {count > 1 ? (
              <div className="showcase-dots" role="tablist" aria-label="Головні премʼєри">
                {spotlightItems.map((item, index) => (
                  <button
                    key={`dot-${item.mediaType}-${item.id}`}
                    type="button"
                    role="tab"
                    aria-selected={index === active}
                    aria-label={`Показати ${item.title}`}
                    className={`showcase-dot${index === active ? " is-active" : ""}`}
                    onClick={() => setActive(index)}
                  >
                    <span className="showcase-dot__fill" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="showcase-posters">
            {supportingItems.map((item) => (
              <div
                key={`${item.mediaType}-${item.id}`}
                role="button"
                tabIndex={0}
                className="showcase-poster"
                onClick={() => onSelect(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(item);
                  }
                }}
              >
                <div className="showcase-poster__media">
                  {item.posterUrl ? (
                    <CoverImage
                      src={item.posterUrl}
                      alt={item.title}
                      sizes="(max-width: 900px) 50vw, 18vw"
                    />
                  ) : (
                    <div className="showcase-poster__fallback">
                      {item.title.slice(0, 1)}
                    </div>
                  )}
                </div>
                <MovieInfoButton
                  tmdbId={item.id}
                  mediaType={item.mediaType}
                  title={item.title}
                  onActivate={() => onSelect(item)}
                />
                <div className="showcase-poster__shade" />
                <div className="showcase-poster__content">
                  <strong>{item.title}</strong>
                  <span>
                    {item.mediaType === "movie"
                      ? copy.mediaType.movie
                      : copy.mediaType.series}
                    {item.year ? ` · ${item.year}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
