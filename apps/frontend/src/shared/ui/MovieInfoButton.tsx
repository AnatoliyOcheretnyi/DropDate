"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Details } from "../lib/release";
import { MoviePreviewPortal } from "./MoviePreviewPortal";

const HOVER_DELAY = 200;

// Module-level cache shared across every button instance (home, search, mood…).
const detailsCache = new Map<number, Details>();

async function loadDetails(
  tmdbId: number,
  mediaType: string
): Promise<Details | null> {
  const response = await fetch(
    `/api/details?tmdbId=${tmdbId}&mediaType=${mediaType}`,
    { cache: "no-store" }
  );
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json().catch(() => null)) as
    | { details?: Details }
    | null;
  return payload?.details ?? null;
}

type Props = {
  tmdbId: number;
  mediaType: string;
  title: string;
  /** Optional click handler (e.g. open the details page). */
  onActivate?: () => void;
  className?: string;
};

/**
 * MovieInfoButton is a drop-in ⓘ button for any poster card. Hovering (or
 * focusing) the button shows an animated details preview via a portal; clicking
 * runs `onActivate`. The parent should be `position: relative`.
 */
export function MovieInfoButton({
  tmdbId,
  mediaType,
  title,
  onActivate,
  className,
}: Props) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [details, setDetails] = useState<Details | null>(null);
  const [loading, setLoading] = useState(false);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const reqIdRef = useRef(0);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const open = useCallback(() => {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      const element = buttonRef.current;
      if (!element) {
        return;
      }
      setAnchor(element.getBoundingClientRect());

      const cached = detailsCache.get(tmdbId);
      if (cached) {
        setDetails(cached);
        setLoading(false);
        return;
      }

      setDetails(null);
      setLoading(true);
      const reqId = ++reqIdRef.current;
      void loadDetails(tmdbId, mediaType)
        .then((result) => {
          if (reqId !== reqIdRef.current) {
            return;
          }
          if (result) {
            detailsCache.set(tmdbId, result);
            setDetails(result);
          }
        })
        .finally(() => {
          if (reqId === reqIdRef.current) {
            setLoading(false);
          }
        });
    }, HOVER_DELAY);
  }, [tmdbId, mediaType]);

  const close = useCallback(() => {
    clearTimer();
    reqIdRef.current++; // cancel any in-flight fetch
    setAnchor(null);
  }, []);

  useEffect(() => clearTimer, []);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`card-info-btn${className ? ` ${className}` : ""}`}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        onClick={(event) => {
          event.stopPropagation();
          onActivate?.();
        }}
        aria-label={`Опис: ${title}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4.25a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8ZM13.4 17.5h-2.8v-6.6h2.8v6.6Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <MoviePreviewPortal
        anchor={anchor}
        title={title}
        details={details}
        loading={loading}
      />
    </>
  );
}
