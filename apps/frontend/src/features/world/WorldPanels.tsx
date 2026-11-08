"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  showFilms: boolean;
  onBack: () => void;
  country: string;
  atlas: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export function WorldPanels({
  showFilms,
  onBack,
  country,
  atlas,
  title,
  actions,
  children,
}: Props) {
  const atlasRef = useRef<HTMLDivElement>(null);
  const filmsRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const previousView = useRef(showFilms);

  useEffect(() => {
    // Keep the WebGL canvas mounted: returning preserves camera and zoom.
    if (atlasRef.current) atlasRef.current.inert = showFilms;
    if (filmsRef.current) filmsRef.current.inert = !showFilms;
    if (previousView.current === showFilms) return;
    previousView.current = showFilms;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setTimeout(
      () => {
        const target = showFilms
          ? backRef.current
          : atlasRef.current?.querySelector<HTMLInputElement>(
              'input[type="search"]',
            );
        target?.focus({ preventScroll: true });
      },
      reduced ? 0 : 580,
    );
    return () => window.clearTimeout(timer);
  }, [showFilms]);

  useEffect(() => {
    if (filmsRef.current) filmsRef.current.scrollTop = 0;
  }, [country]);

  return (
    <div className="world-views" data-view={showFilms ? "films" : "globe"}>
      <div
        className="world-pane world-pane--atlas"
        ref={atlasRef}
        aria-hidden={showFilms}
      >
        {atlas}
      </div>
      <div
        className="world-pane world-pane--films"
        ref={filmsRef}
        aria-hidden={!showFilms}
      >
        <div className="world-cinema-nav">
          <button ref={backRef} className="world-back" onClick={onBack}>
            <span aria-hidden="true">←</span> До глобуса
          </button>
          {title}
          {actions && <div className="world-cinema-actions">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
