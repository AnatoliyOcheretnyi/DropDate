"use client";

import type { Suggestion } from "../../../shared/lib/release";
import { copy } from "../../../shared/lib/strings";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { MovieInfoButton } from "../../../shared/ui/MovieInfoButton";

type Props = {
  spotlight: Suggestion | null;
  supportingItems: Suggestion[];
  onSearchOpen: () => void;
  onSelect: (suggestion: Suggestion) => void;
};

export function HomeShowcase({
  spotlight,
  supportingItems,
  onSearchOpen,
  onSelect,
}: Props) {
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
          {spotlight ? (
            <button
              type="button"
              className="showcase-feature"
              onClick={() => onSelect(spotlight)}
            >
              <div className="showcase-feature__media">
                {spotlight.posterUrl ? (
                  <CoverImage
                    src={spotlight.posterUrl}
                    alt={spotlight.title}
                    sizes="(max-width: 900px) 100vw, 360px"
                    priority
                  />
                ) : (
                  <div className="showcase-feature__fallback">
                    {spotlight.title.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="showcase-feature__shade" />
              <div className="showcase-feature__content">
                <span>Головна премʼєра</span>
                <strong>{spotlight.title}</strong>
                <small>
                  {spotlight.mediaType === "movie"
                    ? copy.mediaType.movie
                    : copy.mediaType.series}
                  {spotlight.year ? ` · ${spotlight.year}` : ""}
                </small>
              </div>
            </button>
          ) : null}

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
