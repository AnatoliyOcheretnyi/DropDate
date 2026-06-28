"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Details } from "../lib/release";

const PREVIEW_WIDTH = 340;
const ESTIMATED_HEIGHT = 380;
const GAP = 12;
const EDGE = 10;

type Props = {
  anchor: DOMRect | null;
  title?: string;
  details: Details | null;
  loading: boolean;
};

/**
 * MoviePreviewPortal renders an animated, viewport-positioned details preview
 * over everything via a portal. It anchors to the given rect: prefers the right
 * side, flips left when there's no room, and clamps within the viewport.
 */
export function MoviePreviewPortal({ anchor, title, details, loading }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !anchor) {
    return null;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = anchor.right + GAP;
  let originX: "left" | "right" = "left";
  if (left + PREVIEW_WIDTH > viewportWidth - EDGE) {
    left = anchor.left - GAP - PREVIEW_WIDTH;
    originX = "right";
  }
  left = Math.max(EDGE, Math.min(left, viewportWidth - PREVIEW_WIDTH - EDGE));

  let top = anchor.top;
  if (top + ESTIMATED_HEIGHT > viewportHeight - EDGE) {
    top = Math.max(EDGE, viewportHeight - EDGE - ESTIMATED_HEIGHT);
  }

  const heading = details?.title || title;
  const backdrop = details?.backdropUrl || details?.posterUrl;
  const meta: string[] = [];
  if (details?.releaseDate) {
    meta.push(details.releaseDate.slice(0, 4));
  }
  if (details?.runtime) {
    meta.push(`${details.runtime} хв`);
  }
  if (typeof details?.voteAverage === "number" && details.voteAverage > 0) {
    meta.push(`★ ${details.voteAverage.toFixed(1)}`);
  }

  return (
    <>
      {createPortal(
        <div
          className="movie-preview"
          data-origin={originX}
          style={{ left, top, width: PREVIEW_WIDTH }}
          role="dialog"
          aria-label={heading}
        >
          {backdrop ? (
            <div className="movie-preview-media">
              <img src={backdrop} alt="" />
            </div>
          ) : null}

          <div className="movie-preview-body">
            {details ? (
              <>
                {heading ? (
                  <strong className="movie-preview-title">{heading}</strong>
                ) : null}
                {meta.length ? (
                  <div className="movie-preview-meta">
                    {meta.map((value) => (
                      <span key={value}>{value}</span>
                    ))}
                  </div>
                ) : null}
                {details.genres?.length ? (
                  <div className="movie-preview-genres">
                    {details.genres.slice(0, 3).map((genre) => (
                      <span key={genre}>{genre}</span>
                    ))}
                  </div>
                ) : null}
                {details.overview ? (
                  <p className="movie-preview-overview">{details.overview}</p>
                ) : (
                  <p className="movie-preview-overview movie-preview-overview--muted">
                    Опис недоступний.
                  </p>
                )}
              </>
            ) : (
              <div className="movie-preview-skeleton" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            )}
            {loading && !details ? (
              <span className="movie-preview-loading">Завантажуємо…</span>
            ) : null}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
