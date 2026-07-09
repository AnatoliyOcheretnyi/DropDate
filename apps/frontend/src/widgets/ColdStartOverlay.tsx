"use client";

import { useEffect, useMemo, useState } from "react";
import { loadColdStartFilms } from "../shared/lib/coldStartFilms";
import { useBackendWake } from "../shared/hooks/useBackendWake";

const FILM_INTERVAL_MS = 2600;
// Render's free tier typically wakes in well under a minute.
const EXPECTED_WAKE_MS = 45000;

export function ColdStartOverlay() {
  const { status, waitedMs } = useBackendWake();
  const isOpen = status === "waking" || status === "ready";

  // Read localStorage only once the overlay is actually needed, and only on the
  // client, so the server and first client render agree.
  const films = useMemo(() => (isOpen ? loadColdStartFilms() : []), [isOpen]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!isOpen || films.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % films.length);
    }, FILM_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isOpen, films.length]);

  // The page behind is unusable until the backend answers — lock its scroll.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const film = films[index];
  const seconds = Math.floor(waitedMs / 1000);
  // Asymptotic: always advancing, never claiming to be done.
  const progress =
    status === "ready" ? 100 : Math.min(92, (waitedMs / EXPECTED_WAKE_MS) * 92);

  return (
    <div
      className={`coldstart${status === "ready" ? " coldstart--ready" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label="Сервер прокидається"
    >
      <div className="coldstart__panel">
        {status === "ready" ? (
          <p className="coldstart__title">Готово — вмикаємось</p>
        ) : (
          <>
            <p className="coldstart__eyebrow">Сервер прокидається</p>
            <h2 className="coldstart__title">Заждіть кілька секунд</h2>
            <p className="coldstart__hint">
              DropDate живе на безкоштовному хостингу, тож після простою бекенд
              стартує заново. А поки — щось із золотої десятки.
            </p>
          </>
        )}

        {status !== "ready" && film ? (
          <div className="coldstart__film" key={`${film.mediaType}-${film.id}`}>
            {film.posterUrl ? (
              // Plain <img>: next/image would route through the Next server,
              // which is the thing we are already waiting on.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="coldstart__poster"
                src={film.posterUrl}
                alt={film.title}
              />
            ) : null}
            <div className="coldstart__film-body">
              <strong className="coldstart__film-title">{film.title}</strong>
              {film.year ? (
                <span className="coldstart__film-year">{film.year}</span>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="coldstart__progress" aria-hidden="true">
          <span
            className="coldstart__progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>

        {status !== "ready" ? (
          <p className="coldstart__timer">
            {seconds < 1 ? "Стукаємо в двері…" : `Чекаємо ${seconds} с`}
          </p>
        ) : null}
      </div>
    </div>
  );
}
