"use client";

import { getReleaseStatusLabel, type ReleaseInfo } from "../lib/release";
import { copy } from "../lib/strings";
import { CoverImage } from "./CoverImage";
import { ReleaseDetails } from "./ReleaseDetails";

type Props = {
  release: ReleaseInfo;
  onSave: () => void;
  isSaved: boolean;
  disableActions: boolean;
};

export function ResultCard({ release, onSave, isSaved, disableActions }: Props) {
  const heroImage = release.backdropUrl || release.posterUrl;
  const heroFallbackLetter = release.title.slice(0, 1);

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
        {isSaved ? copy.actions.inList : copy.actions.addToList}
      </button>
      </div>
      <div className={`card-hero${heroImage ? "" : " placeholder"}`}>
        {heroImage ? (
          <CoverImage
            src={heroImage}
            alt={release.title}
            sizes="(max-width: 900px) 100vw, 50vw"
          />
        ) : (
          <span>{heroFallbackLetter}</span>
        )}
      </div>
      <div className="card-details">
        <h2>{release.title}</h2>
        <ReleaseDetails release={release} />
      </div>
    </article>
  );
}
