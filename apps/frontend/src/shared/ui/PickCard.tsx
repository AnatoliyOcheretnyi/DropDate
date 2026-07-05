"use client";

import type { ReactNode } from "react";
import { CoverImage } from "./CoverImage";
import { MovieInfoButton } from "./MovieInfoButton";

type PickCardItem = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year?: string;
  posterUrl?: string;
  rating?: number;
};

type Props = {
  item: PickCardItem;
  meta: ReactNode;
  secondaryAction: ReactNode;
  onDetails: () => void;
};

export function PickCard({
  item,
  meta,
  secondaryAction,
  onDetails,
}: Props) {
  return (
    <article className="mood-card">
      <div className="mood-card-poster" onClick={onDetails} aria-hidden="true">
        {item.posterUrl ? (
          <CoverImage
            src={item.posterUrl}
            alt=""
            sizes="(max-width: 900px) 50vw, 240px"
            ariaHidden
          />
        ) : (
          <span className="mood-card-fallback">{item.title.slice(0, 1)}</span>
        )}
        {item.rating ? (
          <span className="mood-card-rating">★ {item.rating.toFixed(1)}</span>
        ) : null}
        <MovieInfoButton
          tmdbId={item.tmdbId}
          mediaType={item.mediaType}
          title={item.title}
          onActivate={onDetails}
        />
      </div>
      <div className="mood-card-body">
        <strong className="mood-card-title">{item.title}</strong>
        <div className="mood-card-meta">{meta}</div>
        <div className="mood-card-actions">
          <button type="button" className="mood-card-action" onClick={onDetails}>
            Деталі
          </button>
          {secondaryAction}
        </div>
      </div>
    </article>
  );
}
