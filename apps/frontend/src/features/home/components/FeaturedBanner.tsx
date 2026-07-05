"use client";

import { copy } from "../../../shared/lib/strings";
import type { Details, Suggestion } from "../../../shared/lib/release";
import { CoverImage } from "../../../shared/ui/CoverImage";

type Props = {
  details: Details;
  suggestion: Suggestion;
  isSaved: boolean;
  onAdd: () => void;
  onOpen: () => void;
};

const formatDate = (value?: string) => {
  if (!value) {
    return copy.misc.dash;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
};

export function FeaturedBanner({
  details,
  suggestion,
  isSaved,
  onAdd,
  onOpen,
}: Props) {
  const heroImage = details.backdropUrl || details.posterUrl;
  const rating =
    typeof details.voteAverage === "number"
      ? `${details.voteAverage.toFixed(1)}/10`
      : null;
  const dateLabel = formatDate(details.releaseDate || details.firstAirDate);

  return (
    <section className="featured-shell">
      <div className="featured-banner">
        <div className="featured-media" style={{ position: "relative" }}>
          {heroImage ? (
            <CoverImage
              src={heroImage}
              alt={details.title}
              sizes="(max-width: 900px) 100vw, 60vw"
            />
          ) : (
            <div className="featured-media__fallback">
              {details.title.slice(0, 1)}
            </div>
          )}
          <div className="featured-overlay" />
        </div>
        <div className="featured-bottom-blur" aria-hidden="true" />
        <div className="featured-content">
          <div className="featured-kicker">
            <span className="featured-chip featured-chip--trend">
              №1 у тренді
            </span>
            <span className="featured-chip">{dateLabel}</span>
          </div>
          <h1>{details.title}</h1>
          <div className="featured-metrics">
            {rating && (
              <span className="featured-metric">
                <span className="featured-metric__icon">★</span>
                {rating}
              </span>
            )}
            {details.voteCount ? (
              <span className="featured-metric">
                {details.voteCount} голосів
              </span>
            ) : null}
          </div>
          <p className="featured-description">
            {details.overview || copy.hints.noOverview}
          </p>
          <div className="featured-actions">
            <button type="button" className="primary" onClick={onOpen}>
              {copy.actions.details}
            </button>
            <button type="button" className="secondary" onClick={onAdd}>
              {isSaved ? copy.actions.inList : copy.header.savedList}
            </button>
          </div>
          <p className="featured-caption">
            {suggestion.mediaType === "movie"
              ? copy.mediaType.movie
              : copy.mediaType.series}
          </p>
        </div>
      </div>
    </section>
  );
}
