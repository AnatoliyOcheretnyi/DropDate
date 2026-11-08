"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { placeBeside } from "../lib/anchorPlacement";
import type { Details } from "../lib/release";
import type { ListType } from "../types/releases";
import { CoverImage } from "./CoverImage";
import { ListStatusBar } from "./ListStatusBar";
import Link from "next/link";
import { useSavedReleases } from "../../features/saved/hooks/useSavedReleases";

const PREVIEW_WIDTH = 340;
const ESTIMATED_HEIGHT = 380;

type Props = {
  anchor: DOMRect | null;
  title?: string;
  details: Details | null;
  loading: boolean;
  /** Called when the pointer enters the preview (keeps it open). */
  onHoverEnter?: () => void;
  /** Called when the pointer leaves the preview (schedules close). */
  onHoverLeave?: () => void;
  /** Lists the title currently belongs to (drives the toggle buttons). */
  activeLists?: ListType[];
  /** Optional override for list updates; otherwise uses the shared saved lists. */
  onChangeLists?: (next: ListType[]) => void;
  onActivate?: () => void;
};

/**
 * MoviePreviewPortal renders an animated, viewport-positioned details preview
 * over everything via a portal. It anchors to the given rect: prefers the right
 * side, flips left when there's no room, and clamps within the viewport. The
 * preview is interactive — hovering it keeps it open, long text scrolls, and it
 * exposes primary/save actions in a sticky footer.
 */
export function MoviePreviewPortal({
  anchor,
  title,
  details,
  loading,
  onHoverEnter,
  onHoverLeave,
  activeLists,
  onChangeLists,
  onActivate,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !anchor) {
    return null;
  }

  const { left, top, maxHeight, originX } = placeBeside(
    anchor,
    PREVIEW_WIDTH,
    ESTIMATED_HEIGHT
  );

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
          style={{ left, top, width: PREVIEW_WIDTH, maxHeight }}
          role="dialog"
          aria-label={heading}
          onMouseEnter={onHoverEnter}
          onMouseLeave={onHoverLeave}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Escape") onHoverLeave?.();
          }}
          onFocus={onHoverEnter}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onHoverLeave?.();
          }}
        >
          <Link
            className="movie-preview-content"
            href={details ? `/title/${details.mediaType}/${details.id}` : "#"}
            aria-label={heading}
            aria-disabled={!details}
            onClick={(event) => {
              if (!details || onActivate) event.preventDefault();
              if (details) onActivate?.();
            }}
          >
          {backdrop ? (
            <div className="movie-preview-media">
              <CoverImage src={backdrop} alt="" sizes="340px" ariaHidden />
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
            ) : loading ? (
              <div className="movie-preview-skeleton" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            ) : <p className="movie-preview-overview">Не вдалося завантажити опис. Спробуй відкрити ще раз.</p>}
            {loading && !details ? (
              <span className="movie-preview-loading">Завантажуємо…</span>
            ) : null}
          </div>
          </Link>
          {details ? (
            <div className="movie-preview-lists">
              {onChangeLists ? <ListStatusBar
                selected={activeLists ?? []}
                onChange={onChangeLists}
                variant="compact"
              /> : <PreviewSavedLists details={details} />}
            </div>
          ) : null}
        </div>,
        document.body
      )}
    </>
  );
}

// Mount the saved-list subscription only while a loaded preview is open.
function PreviewSavedLists({ details }: { details: Details }) {
  const { getListTypes, setSuggestionLists } = useSavedReleases();
  return <ListStatusBar
    selected={getListTypes(details)}
    variant="compact"
    onChange={(next) => setSuggestionLists(details, next, {
      title: details.title,
      type: details.mediaType === "movie" ? "movie" : "series",
      nextRelease: details.nextAirDate ?? details.releaseDate ?? "",
      source: "tmdb",
      posterUrl: details.posterUrl,
      backdropUrl: details.backdropUrl,
      status: (details.nextAirDate || details.releaseDate || "") > new Date().toISOString().slice(0, 10) ? "upcoming" : "released",
    })}
  />;
}
