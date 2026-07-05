"use client";

import type { Details, ReleaseInfo } from "../../../shared/lib/release";
import type { ListType } from "../../../shared/types/releases";
import { copy } from "../../../shared/lib/strings";
import { ListBadges } from "../../../shared/ui/ListBadges";
import { ListPickerModal } from "../../../widgets/ListPickerModal";

type Props = {
  details: Details;
  currentListTypes: ListType[];
  listPickerAnchor: "main" | "release" | null;
  currentRelease: ReleaseInfo | null;
  releaseStatus: string | null;
  onBack: () => void;
  onAddCurrent: (anchor: "main" | "release") => void;
  onListChange: (next: ListType[]) => void;
  onCloseListPicker: () => void;
  formatDate: (value?: string) => string;
  yearFromDate: (value?: string) => string;
};

export function TitleDetailsHero({
  details,
  currentListTypes,
  listPickerAnchor,
  currentRelease,
  releaseStatus,
  onBack,
  onAddCurrent,
  onListChange,
  onCloseListPicker,
  formatDate,
  yearFromDate,
}: Props) {
  const mediaLabel =
    details.mediaType === "movie" ? copy.mediaType.movie : copy.mediaType.series;

  return (
    <section className="details-hero">
      <div className="details-inner">
        <button type="button" className="details-back" onClick={onBack}>
          <span aria-hidden="true">←</span>
          Назад
        </button>

        <div className="details-layout">
          <div className="details-main">
            <div className="details-kicker">
              <span>{mediaLabel}</span>
              {details.releaseDate || details.firstAirDate ? (
                <span>{yearFromDate(details.releaseDate || details.firstAirDate)}</span>
              ) : null}
              {currentListTypes.length > 0 ? (
                <div className="details-status-badges">
                  <ListBadges listTypes={currentListTypes} />
                </div>
              ) : null}
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
              {details.networks?.length ? <span>{details.networks.join(", ")}</span> : null}
            </div>

            {details.tagline ? <p className="details-tagline">{details.tagline}</p> : null}
            <p className="details-overview">{details.overview || copy.hints.noOverview}</p>

            {details.genres?.length ? (
              <div className="details-tags">
                {details.genres.map((genre) => (
                  <span key={genre} className="detail-chip">
                    {genre}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="details-actions">
              <div className="list-picker">
                <button
                  type="button"
                  className={`list-picker__button${
                    currentListTypes.length > 0 ? " is-active" : ""
                  }`}
                  onClick={() => onAddCurrent("main")}
                >
                  {currentListTypes.length > 0 ? (
                    <>
                      <span className="list-picker__check">✓</span>
                      <span>
                        У {currentListTypes.length}{" "}
                        {currentListTypes.length === 1 ? "списку" : "списках"}
                      </span>
                    </>
                  ) : (
                    copy.actions.addToList
                  )}
                </button>
                <ListPickerModal
                  isOpen={listPickerAnchor === "main"}
                  selected={currentListTypes}
                  onClose={onCloseListPicker}
                  onChange={onListChange}
                />
              </div>
              {details.homepage ? (
                <a
                  className="details-site-link"
                  href={details.homepage}
                  target="_blank"
                  rel="noreferrer"
                >
                  Офіційний сайт
                </a>
              ) : null}
            </div>
          </div>

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
                <strong>
                  {details.voteAverage ? details.voteAverage.toFixed(1) : copy.misc.dash}
                </strong>
              </div>
              <div>
                <span>{copy.details.labels.votes}</span>
                <strong>
                  {details.voteCount
                    ? details.voteCount.toLocaleString("uk-UA")
                    : copy.misc.dash}
                </strong>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
