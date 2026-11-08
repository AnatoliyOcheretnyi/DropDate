"use client";

import type { HTMLAttributes } from "react";
import { MovieInfoButton } from "./MovieInfoButton";

type Props = Omit<HTMLAttributes<HTMLDivElement>, "onClick" | "onKeyDown"> & {
  tmdbId?: number;
  mediaType?: string;
  title: string;
  onActivate: () => void;
};

/** A keyboard-accessible card with an independent preview control. */
export function MovieCardSurface({ tmdbId, mediaType, title, onActivate, children, className, ...props }: Props) {
  return <div {...props} className={`movie-card-surface ${className ?? ""}`} role="button" tabIndex={0} aria-label={title}
    onClick={event => { event.stopPropagation(); onActivate(); }}
    onKeyDown={event => {
      if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        onActivate();
      }
    }}>
    {children}
    {tmdbId && mediaType ? <MovieInfoButton tmdbId={tmdbId} mediaType={mediaType} title={title} /> : null}
  </div>;
}
