"use client";

import type { MoodPick } from "../api/mood";
import { MovieInfoButton } from "../../../shared/ui/MovieInfoButton";

type Props = {
  picks: MoodPick[];
  onMore: () => void;
  onReset: () => void;
  onDetails: (pick: MoodPick) => void;
  onSave: (pick: MoodPick) => void;
  isSaved: (pick: MoodPick) => boolean;
};

export function MoodResults({
  picks,
  onMore,
  onReset,
  onDetails,
  onSave,
  isSaved,
}: Props) {
  return (
    <div className="mood-results">
      <div className="mood-results-head">
        <h2>Ось що підібрали</h2>
        <p>Наведи на ⓘ, щоб прочитати опис.</p>
      </div>

      <div className="mood-grid">
        {picks.map((pick) => {
          const saved = isSaved(pick);
          return (
            <article key={pick.tmdbId} className="mood-card">
              <div
                className="mood-card-poster"
                onClick={() => onDetails(pick)}
                aria-hidden="true"
              >
                {pick.posterUrl ? (
                  <img src={pick.posterUrl} alt="" loading="lazy" />
                ) : (
                  <span className="mood-card-fallback">
                    {pick.title.slice(0, 1)}
                  </span>
                )}
                {pick.rating ? (
                  <span className="mood-card-rating">
                    ★ {pick.rating.toFixed(1)}
                  </span>
                ) : null}
                <MovieInfoButton
                  tmdbId={pick.tmdbId}
                  mediaType={pick.mediaType}
                  title={pick.title}
                  onActivate={() => onDetails(pick)}
                />
              </div>
              <div className="mood-card-body">
                <strong className="mood-card-title">{pick.title}</strong>
                <div className="mood-card-meta">
                  {pick.year ? <span>{pick.year}</span> : null}
                  {pick.reason ? (
                    <span className="mood-card-reason">{pick.reason}</span>
                  ) : null}
                </div>
                <div className="mood-card-actions">
                  <button
                    type="button"
                    className="mood-card-action"
                    onClick={() => onDetails(pick)}
                  >
                    Деталі
                  </button>
                  <button
                    type="button"
                    className={`mood-card-action mood-card-action--save${
                      saved ? " saved" : ""
                    }`}
                    onClick={() => onSave(pick)}
                  >
                    {saved ? "У списку ✓" : "Зберегти"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mood-results-actions">
        <button type="button" className="primary" onClick={onMore}>
          Ще варіанти
        </button>
        <button type="button" onClick={onReset}>
          Спочатку
        </button>
      </div>
    </div>
  );
}
