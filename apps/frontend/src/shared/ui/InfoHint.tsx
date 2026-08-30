"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { placeBeside } from "../lib/anchorPlacement";

const HINT_WIDTH = 340;
const ESTIMATED_HEIGHT = 340;

const HOVER_DELAY = 120;
// Grace period after leaving the button so the pointer can travel the gap to
// the card without it closing under the cursor.
const CLOSE_DELAY = 160;

type Props = {
  /** Heading of the card, and the button's accessible name. */
  title: string;
  children: ReactNode;
  className?: string;
};

/**
 * InfoHint is the ⓘ button for explaining a feature, built to read as the same
 * object as the film preview: same card, same hover timing, same way of
 * anchoring itself. The card is hoverable, so long copy can be read and
 * scrolled rather than chased.
 *
 * Unlike the film preview it also opens on click, because on a touch screen
 * hover never happens and an explanation nobody can reach explains nothing.
 */
export function InfoHint({ title, children, className }: Props) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [pinned, setPinned] = useState(false);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const show = useCallback(() => {
    const element = buttonRef.current;
    if (element) {
      setAnchor(element.getBoundingClientRect());
    }
  }, []);

  const open = useCallback(() => {
    clearTimers();
    openTimerRef.current = window.setTimeout(show, HOVER_DELAY);
  }, [show]);

  const scheduleClose = useCallback(() => {
    if (pinned) {
      return;
    }
    clearTimers();
    closeTimerRef.current = window.setTimeout(() => setAnchor(null), CLOSE_DELAY);
  }, [pinned]);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    clearTimers();
    setPinned(false);
    setAnchor(null);
  }, []);

  useEffect(() => clearTimers, []);

  // A pinned card is modal enough that Escape should dismiss it.
  useEffect(() => {
    if (!pinned) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close, pinned]);

  const placement = anchor
    ? placeBeside(anchor, HINT_WIDTH, ESTIMATED_HEIGHT, 200)
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`info-hint__trigger${className ? ` ${className}` : ""}`}
        onMouseEnter={open}
        onMouseLeave={scheduleClose}
        onFocus={open}
        onBlur={scheduleClose}
        onClick={() => {
          if (pinned) {
            close();
            return;
          }
          setPinned(true);
          clearTimers();
          show();
        }}
        aria-expanded={anchor !== null}
        aria-label={title}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4.25a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8ZM13.4 17.5h-2.8v-6.6h2.8v6.6Z"
            fill="currentColor"
          />
        </svg>
        <span>Як це працює</span>
      </button>

      {placement
        ? createPortal(
            <div
              className="movie-preview info-hint"
              data-origin={placement.originX}
              style={{
                left: placement.left,
                top: placement.top,
                width: HINT_WIDTH,
                maxHeight: placement.maxHeight,
              }}
              role="dialog"
              aria-label={title}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              <div className="info-hint__head">
                <strong>{title}</strong>
                {pinned ? (
                  <button
                    type="button"
                    className="info-hint__close"
                    onClick={close}
                    aria-label="Закрити"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
              <div className="movie-preview-body info-hint__body">{children}</div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
