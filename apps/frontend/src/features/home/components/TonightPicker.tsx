"use client";
import { MovieInfoButton } from "../../../shared/ui/MovieInfoButton";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { CoverImage } from "../../../shared/ui/CoverImage";

export function TonightPicker() {
  const { saved } = useSavedReleases();
  const [open, setOpen] = useState(false),
    [runtime, setRuntime] = useState(0),
    [genre, setGenre] = useState(""),
    [offset, setOffset] = useState(0);
  const watchlist = useMemo(
    () =>
      saved.filter(
        (item) =>
          item.listTypes?.includes("watchlist") &&
          !item.listTypes?.includes("watched") &&
          !item.watchCount &&
          !item.lastWatchedAt &&
          !item.listTypes?.includes("disliked") &&
          item.mediaType === "movie",
      ),
    [saved],
  );
  const genres = Array.from(
    new Set(watchlist.flatMap((i) => i.genres ?? [])),
  ).sort();
  const matches = useMemo(
    () =>
      watchlist
        .filter(
          (item) =>
            (!genre || item.genres?.includes(genre)) &&
            (!runtime ||
              (item.runtimeMinutes && item.runtimeMinutes <= runtime)),
        )
        .sort((a, b) => (b.tmdbRating ?? 0) - (a.tmdbRating ?? 0)),
    [watchlist, genre, runtime],
  );
  const picks = matches.slice(offset, offset + 3);
  return (
    <section className="tonight">
      <div className="tonight-bar">
        <div>
          <h2>Що подивитися сьогодні?</h2>
          <p>Знайди нове або обери те, що давно відкладаєш.</p>
        </div>
        <Link href="/mood">Підібрати фільм ↗</Link>
        <button
          className="secondary"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          Обрати зі збереженого
        </button>
        <Link href="/games/wheel">Колесо вечора ↗</Link>
        <Link href="/world">Відкрити світ кіно ↗</Link>
      </div>
      {open && (
        <div className="tonight-panel">
          <div className="world-filters">
            <label>
              Маю часу
              <select
                value={runtime}
                onChange={(e) => {
                  setRuntime(Number(e.target.value));
                  setOffset(0);
                }}
              >
                <option value="0">Будь-яка тривалість</option>
                <option value="90">До 90 хв</option>
                <option value="120">До 2 годин</option>
              </select>
            </label>
            <label>
              Хочу подивитись
              <select
                value={genre}
                onChange={(e) => {
                  setGenre(e.target.value);
                  setOffset(0);
                }}
              >
                <option value="">Будь-який жанр</option>
                {genres.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="tonight-picks">
            {picks.map((item) => (
              <div className="tonight-pick" key={item.id}>
              {item.tmdbId ? <MovieInfoButton tmdbId={item.tmdbId} mediaType="movie" title={item.title} /> : null}
              <Link href={`/title/movie/${item.tmdbId}`}>
                {item.posterUrl && (
                  <CoverImage src={item.posterUrl} alt="" sizes="90px" />
                )}
                <div>
                  <strong>{item.title}</strong>
                  <p>
                    {item.runtimeMinutes ? `${item.runtimeMinutes} хв · ` : ""}
                    {item.genres?.slice(0, 2).join(",")}
                  </p>
                  <span>Із твого списку «Хочу подивитись» ↗</span>
                </div>
              </Link>
              </div>
            ))}
          </div>
          {!picks.length && (
            <p>
              За цими умовами фільмів немає. Зміни фільтри або додай фільми до
              списку «Хочу подивитись».
            </p>
          )}
          {runtime > 0 && (
            <small>
              Фільми без відомої тривалості не включено до добірки з обмеженням
              часу.
            </small>
          )}
          {matches.length > 3 && (
            <button
              className="secondary"
              onClick={() =>
                setOffset(offset + 3 >= matches.length ? 0 : offset + 3)
              }
            >
              Ще три варіанти →
            </button>
          )}
        </div>
      )}
    </section>
  );
}
