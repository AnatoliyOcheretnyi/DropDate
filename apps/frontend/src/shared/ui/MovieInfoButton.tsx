"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { requestApi } from "../api/http";
import type { Details } from "../lib/release";
import type { ListType } from "../types/releases";
import { MoviePreviewPortal } from "./MoviePreviewPortal";

const HOVER_DELAY = 200;
// Grace period after leaving the button/preview so the pointer can travel the
// gap between them without the preview closing.
const CLOSE_DELAY = 160;

// Module-level cache shared across every button instance (home, search, mood…).
const detailsCache = new Map<number, Details>();

async function loadDetails(
  tmdbId: number,
  mediaType: string
): Promise<Details | null> {
  const response = await requestApi<{ details?: Details }>({
    url: "/api/details",
    method: "GET",
    params: { tmdbId, mediaType },
  });
  if (!response.ok) {
    return null;
  }
  return response.payload?.details ?? null;
}

type Props = {
  tmdbId: number;
  mediaType: string;
  title: string;
  /** Optional click handler (e.g. open the details page). */
  onActivate?: () => void;
  /** Lists the title belongs to + change handler for the preview footer. */
  activeLists?: ListType[];
  onChangeLists?: (next: ListType[]) => void;
  className?: string;
};

/**
 * MovieInfoButton is a drop-in ⓘ button for any poster card. Hovering (or
 * focusing) the button shows an animated details preview via a portal; the
 * preview itself is hoverable (scroll long text, click actions). Clicking the
 * button runs `onActivate`. The parent should be `position: relative`.
 */
export function MovieInfoButton({
  tmdbId,
  mediaType,
  title,
  onActivate,
  activeLists,
  onChangeLists,
  className,
}: Props) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [details, setDetails] = useState<Details | null>(null);
  const [loading, setLoading] = useState(false);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const reqIdRef = useRef(0);

  const clearOpenTimer = () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  };

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const open = useCallback(() => {
    clearCloseTimer();
    clearOpenTimer();
    openTimerRef.current = window.setTimeout(() => {
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

  const scheduleClose = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      reqIdRef.current++; // cancel any in-flight fetch
      setAnchor(null);
    }, CLOSE_DELAY);
  }, []);

  const cancelClose = useCallback(() => {
    clearCloseTimer();
  }, []);

  useEffect(
    () => () => {
      clearOpenTimer();
      clearCloseTimer();
    },
    []
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`card-info-btn${className ? ` ${className}` : ""}`}
        onMouseEnter={open}
        onMouseLeave={scheduleClose}
        onFocus={open}
        onBlur={scheduleClose}
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
        onHoverEnter={cancelClose}
        onHoverLeave={scheduleClose}
        activeLists={activeLists}
        onChangeLists={onChangeLists}
      />
    </>
  );
}
