"use client";

import type { Details } from "../../../shared/lib/release";
import type { ListType } from "../../../shared/types/releases";
import { copy } from "../../../shared/lib/strings";
import { ListPickerModal } from "../../../widgets/ListPickerModal";

type MetaRow = {
  label: string;
  value: string;
};

type Props = {
  details: Details;
  metaRows: MetaRow[];
  currentListTypes: ListType[];
  listPickerAnchor: "main" | "release" | null;
  statusListType: string | null;
  localRating?: number;
  localWatchCount: number;
  setLocalRating: (value: number | undefined) => void;
  onAddCurrent: (anchor: "main" | "release") => void;
  onListChange: (next: ListType[]) => void;
  onCloseListPicker: () => void;
  onRatingChange: (value: number) => void;
  onWatchCountChange: (delta: number) => void;
  formatDate: (value?: string) => string;
};

export function TitleDetailsInfoPanels({
  details,
  metaRows,
  currentListTypes,
  listPickerAnchor,
  statusListType,
  localRating,
  localWatchCount,
  setLocalRating,
  onAddCurrent,
  onListChange,
  onCloseListPicker,
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
          {metaRows.map((row) => (
            <div key={row.label} className="detail-row">
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
            <div className="details-user-row">
              <span>{copy.details.labels.yourRating}</span>
              <div className="details-user-rating">
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={localRating || 1}
                  onChange={(event) => onRatingChange(Number(event.target.value))}
                />
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={localRating ?? ""}
                  placeholder="–"
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isNaN(value)) {
                      setLocalRating(undefined);
                      return;
                    }
                    onRatingChange(Math.min(10, Math.max(1, value)));
                  }}
                />
              </div>
            </div>
            <div className="details-user-row">
              <span>{copy.details.labels.watchCount}</span>
              <div className="details-user-stepper">
                <button
                  type="button"
                  onClick={() => onWatchCountChange(-1)}
                  aria-label="Зменшити"
                >
                  −
                </button>
                <span>{localWatchCount || 1}</span>
                <button
                  type="button"
                  onClick={() => onWatchCountChange(1)}
                  aria-label="Збільшити"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="details-personal-copy">
              Збережи тайтл, щоб стежити за релізом і вести власний прогрес.
            </p>
            <div className="list-picker">
              <button
                type="button"
                className="list-picker__button"
                onClick={() => onAddCurrent("release")}
              >
                {copy.actions.addToList}
              </button>
              <ListPickerModal
                isOpen={listPickerAnchor === "release"}
                selected={currentListTypes}
                onClose={onCloseListPicker}
                onChange={onListChange}
              />
            </div>
          </>
        )}
      </aside>
    </section>
  );
}
