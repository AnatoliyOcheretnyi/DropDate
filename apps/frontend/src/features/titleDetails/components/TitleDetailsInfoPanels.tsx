"use client";

import type { Details } from "../../../shared/lib/release";
import type { ListType } from "../../../shared/types/releases";
import { copy } from "../../../shared/lib/strings";
import { RatingScale } from "./RatingScale";
import { WatchStepper } from "./WatchStepper";
import { ListStatusBar } from "../../../shared/ui/ListStatusBar";

type MetaRow = {
  label: string;
  value: string;
};

type Props = {
  details: Details;
  metaRows: MetaRow[];
  currentListTypes: ListType[];
  statusListType: string | null;
  localRating?: number;
  localWatchCount: number;
  onListChange: (next: ListType[]) => void;
  onRatingChange: (value: number) => void;
  onWatchCountChange: (delta: number) => void;
  formatDate: (value?: string) => string;
};

export function TitleDetailsInfoPanels({
  details,
  metaRows,
  currentListTypes,
  statusListType,
  localRating,
  localWatchCount,
  onListChange,
  onRatingChange,
  onWatchCountChange,
  formatDate,
}: Props) {
  return (
    <section className="details-body details-section">
      <article className="details-info-card">
        <div className="details-section-head">
          <p className="eyebrow">Про тайтл</p>
          <h2>Основна інформація</h2>
        </div>
        <div className="details-grid">
          {metaRows.map((row, index) => (
            <div
              key={row.label}
              className="detail-row"
              style={{ ["--row-index" as string]: index }}
            >
              <span className="detail-label">{row.label}</span>
              <span className="detail-value">{row.value}</span>
            </div>
          ))}
          {details.nextAirDate ? (
            <div className="detail-row detail-row--wide">
              <span className="detail-label">{copy.details.labels.nextEpisode}</span>
              <span className="detail-value">
                {formatDate(details.nextAirDate)}
                {details.nextEpisodeName ? ` · ${details.nextEpisodeName}` : ""}
              </span>
            </div>
          ) : null}
          {details.originCountry?.length ? (
            <div className="detail-row">
              <span className="detail-label">{copy.details.labels.country}</span>
              <span className="detail-value">{details.originCountry.join(", ")}</span>
            </div>
          ) : null}
        </div>
      </article>

      <aside className="details-info-card details-personal-card">
        <div className="details-section-head">
          <p className="eyebrow">Моя бібліотека</p>
          <h2>
            {statusListType ? copy.details.labels.personalTitle : "Додай до списку"}
          </h2>
        </div>

        {statusListType ? (
          <div className="details-user-controls">
            <div className="details-user-block">
              <span className="details-user-label">
                {copy.details.labels.yourRating}
              </span>
              <RatingScale value={localRating} onChange={onRatingChange} />
            </div>
            <div className="details-user-block details-user-block--row">
              <span className="details-user-label">
                {copy.details.labels.watchCount}
              </span>
              <WatchStepper
                value={localWatchCount}
                onChange={onWatchCountChange}
              />
            </div>
          </div>
        ) : (
          <>
            <p className="details-personal-copy">
              Збережи тайтл, щоб стежити за релізом і вести власний прогрес.
            </p>
            <ListStatusBar
              selected={currentListTypes}
              onChange={onListChange}
              variant="compact"
            />
          </>
        )}
      </aside>
    </section>
  );
}
