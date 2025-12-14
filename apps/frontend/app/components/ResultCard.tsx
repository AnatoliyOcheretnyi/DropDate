"use client";

import { getReleaseStatusLabel, type ReleaseInfo } from "../../lib/release";
import { ReleaseDetails } from "./ReleaseDetails";

type Props = {
  release: ReleaseInfo;
  onSave: () => void;
  isSaved: boolean;
  disableActions: boolean;
};

export function ResultCard({ release, onSave, isSaved, disableActions }: Props) {
  return (
    <article className="card">
      <div className="card-head">
        <p className="card-label">{getReleaseStatusLabel(release.status, release.type)}</p>
        <button
          type="button"
          className="secondary"
          onClick={onSave}
          disabled={disableActions || isSaved}
        >
          {isSaved ? "У списку" : "Додати у список"}
        </button>
      </div>
      <div className="card-body">
        <div className={`poster${release.posterUrl ? "" : " placeholder"}`}>
          {release.posterUrl ? (
            <img src={release.posterUrl} alt={release.title} loading="lazy" />
          ) : (
            <span>{release.title.slice(0, 1)}</span>
          )}
        </div>
        <div className="card-details">
          <h2>{release.title}</h2>
          <ReleaseDetails release={release} />
        </div>
      </div>
    </article>
  );
}
