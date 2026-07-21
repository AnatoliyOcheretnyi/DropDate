"use client";

import { useRouter } from "next/navigation";
import type { Details, ReleaseInfo } from "../../../shared/lib/release";
import type { ListType } from "../../../shared/types/releases";
import { copy } from "../../../shared/lib/strings";
import { useCountUp } from "../hooks/useCountUp";
import { ListStatusBar } from "../../../shared/ui/ListStatusBar";
import { TitleDetailsPoster } from "./TitleDetailsPoster";
import { CoverImage } from "../../../shared/ui/CoverImage";

type Props = {
  details: Details;
  currentListTypes: ListType[];
  currentRelease: ReleaseInfo | null;
  releaseStatus: string | null;
  onBack: () => void;
  onListChange: (next: ListType[]) => void;
  formatDate: (value?: string) => string;
  yearFromDate: (value?: string) => string;
};

export function TitleDetailsHero({
  details,
  currentListTypes,
  currentRelease,
  releaseStatus,
  onBack,
  onListChange,
  formatDate,
  yearFromDate,
}: Props) {
  const router = useRouter();
  const mediaLabel =
    details.mediaType === "movie" ? copy.mediaType.movie : copy.mediaType.series;
  const year = yearFromDate(details.releaseDate || details.firstAirDate);

  const ratingValue = useCountUp(details.voteAverage ?? 0, { duration: 1000 });
  const votesValue = useCountUp(details.voteCount ?? 0, { duration: 1100 });

  const directors = details.directors ?? [];
  const isCreatorCredit = directors[0]?.job === "Creator";
  const crewKicker = isCreatorCredit
    ? directors.length > 1
      ? "Творці"
      : "Творець"
    : directors.length > 1
    ? "Режисери"
    : "Режисер";

  return (
    <section className="details-hero">
      <div className="details-inner">
        <button type="button" className="details-back" onClick={onBack}>
          <span aria-hidden="true">←</span>
          Назад
        </button>

        <div className="details-layout">
          <div className="details-headline">
            <TitleDetailsPoster
              src={details.posterUrl}
              alt={details.title}
              badge={year || mediaLabel}
            />

            <div className="details-main">
              <div className="details-kicker">
                <span>{mediaLabel}</span>
                {year ? <span>{year}</span> : null}
              </div>

              <h1>{details.title}</h1>

              <div className="details-facts">
                {details.runtime ? (
                  <span>
                    {details.runtime} {copy.details.facts.minutesSuffix}
                  </span>
                ) : null}
                {details.seasonCount ? (
                  <span>
                    {details.seasonCount} {copy.details.facts.seasonsSuffix}
                  </span>
                ) : null}
                {details.episodeCount ? (
                  <span>
                    {details.episodeCount} {copy.details.facts.episodesSuffix}
                  </span>
                ) : null}
                {details.networks?.length ? (
                  <span>{details.networks.join(", ")}</span>
                ) : null}
              </div>

              {details.tagline ? (
                <p className="details-tagline">{details.tagline}</p>
              ) : null}
              <p className="details-overview">
                {details.overview || copy.hints.noOverview}
              </p>

              {details.genres?.length ? (
                <div className="details-tags">
                  {details.genres.map((genre) => (
                    <span key={genre} className="detail-chip">
                      {genre}
                    </span>
                  ))}
                </div>
              ) : null}

              <ListStatusBar
                selected={currentListTypes}
                onChange={onListChange}
              />

              {details.homepage ? (
                <div className="details-actions">
                  <a
                    className="details-site-link"
                    href={details.homepage}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Офіційний сайт
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
              ) : null}
            </div>
          </div>

          <div className="details-aside">
            <aside className="details-release-panel">
            <span className="details-release-kicker">
              {releaseStatus || copy.details.labels.release}
            </span>
            <strong className="details-release-date">
              {formatDate(
                currentRelease?.nextRelease ||
                  details.nextAirDate ||
                  details.releaseDate ||
                  details.firstAirDate
              )}
            </strong>
            {details.nextEpisodeName ? (
              <span className="details-release-episode">
                {details.nextEpisodeSeason && details.nextEpisodeNumber
                  ? `S${details.nextEpisodeSeason}E${details.nextEpisodeNumber} · `
                  : ""}
                {details.nextEpisodeName}
              </span>
            ) : null}

            <div className="details-rating-row">
              <div>
                <span>{copy.details.labels.tmdbRating}</span>
                <strong className="details-rating-score">
                  {details.voteAverage ? ratingValue.toFixed(1) : copy.misc.dash}
                </strong>
              </div>
              <div>
                <span>{copy.details.labels.votes}</span>
                <strong>
                  {details.voteCount
                    ? Math.round(votesValue).toLocaleString("uk-UA")
                    : copy.misc.dash}
                </strong>
              </div>
            </div>

            </aside>

            {directors.length ? (
              <div className="details-director-card">
                <span className="details-director-card__kicker">
                  {crewKicker}
                </span>
                <div className="details-director-card__list">
                  {directors.map((person) => (
                    <button
                      type="button"
                      key={person.tmdbId}
                      className="details-director details-director--link"
                      onClick={() =>
                        router.push(`/person/${person.tmdbId}?role=director`)
                      }
                      title={person.name}
                    >
                      <div className="details-director__photo">
                        {person.profileUrl ? (
                          <CoverImage src={person.profileUrl} alt={person.name} sizes="72px" />
                        ) : (
                          <span aria-hidden="true">
                            {person.name.slice(0, 1)}
                          </span>
                        )}
                      </div>
                      <div className="details-director__meta">
                        <strong className="details-director__name">
                          {person.name}
                        </strong>
                        <span className="details-director__role">
                          {person.job === "Creator"
                            ? "Творець серіалу"
                            : "Режисер фільму"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
