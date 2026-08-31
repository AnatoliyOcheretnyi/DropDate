"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { useAuth } from "../../../shared/state/auth";
import { fetchHomeSections } from "../../home/api/homeApi";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { Confetti } from "../components/Confetti";
import { GameShell } from "../components/GameShell";

const MAX_SEGMENTS = 12;
const MIN_SEGMENTS = 4;
const SPIN_TURNS = 5;
const WHEEL_SIZE = 380;
const RADIUS = WHEEL_SIZE / 2;

const PALETTE = [
  "#1d3a2f",
  "#14304a",
  "#3a1d38",
  "#40331a",
  "#1a3a40",
  "#33203f",
  "#2c401a",
  "#401f22",
];

type WheelItem = {
  key: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterUrl?: string;
  year?: string;
};

const sample = <T,>(items: T[], size: number): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, size);
};

const truncate = (value: string, max = 18) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

// One SVG pie segment path from angle a0 to a1 (degrees, 0° = +x axis).
const segmentPath = (a0: number, a1: number) => {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const x0 = RADIUS + RADIUS * Math.cos(rad(a0));
  const y0 = RADIUS + RADIUS * Math.sin(rad(a0));
  const x1 = RADIUS + RADIUS * Math.cos(rad(a1));
  const y1 = RADIUS + RADIUS * Math.sin(rad(a1));
  const largeArc = a1 - a0 > 180 ? 1 : 0;
  return `M ${RADIUS} ${RADIUS} L ${x0} ${y0} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x1} ${y1} Z`;
};

export function WheelScreen() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const { saved } = useSavedReleases();
  const isAuthed = Boolean(user && accessToken);

  const watchlist = useMemo<WheelItem[]>(
    () =>
      saved
        .filter((item) => (item.listTypes ?? []).includes("watchlist") && item.tmdbId)
        .map((item) => ({
          key: item.id,
          tmdbId: item.tmdbId!,
          mediaType: (item.mediaType || (item.type === "movie" ? "movie" : "tv")) as
            | "movie"
            | "tv",
          title: item.title,
          posterUrl: item.posterUrl,
        })),
    [saved]
  );

  const [fallback, setFallback] = useState<WheelItem[]>([]);
  const usingWatchlist = isAuthed && watchlist.length >= MIN_SEGMENTS;
  const source = usingWatchlist ? watchlist : fallback;

  // Guests (or an empty watchlist) spin the popular wheel instead.
  useEffect(() => {
    if (usingWatchlist || fallback.length > 0) {
      return;
    }
    let cancelled = false;
    void fetchHomeSections()
      .then((sections) => {
        if (cancelled) {
          return;
        }
        setFallback(
          sections.popularMovies.slice(0, 20).map((item) => ({
            key: `movie:${item.id}`,
            tmdbId: item.id,
            mediaType: item.mediaType,
            title: item.title,
            posterUrl: item.posterUrl,
            year: item.year,
          }))
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [usingWatchlist, fallback.length]);

  const [segments, setSegments] = useState<WheelItem[]>([]);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<WheelItem | null>(null);
  const rotationRef = useRef(0);

  const reshuffle = useCallback(() => {
    setSegments(sample(source, MAX_SEGMENTS));
    setResult(null);
  }, [source]);

  useEffect(() => {
    setSegments(sample(source, MAX_SEGMENTS));
    setResult(null);
  }, [source]);

  const spin = () => {
    if (spinning || segments.length < 2) {
      return;
    }
    const winnerIndex = Math.floor(Math.random() * segments.length);
    const segmentAngle = 360 / segments.length;
    const winnerCenter = (winnerIndex + 0.5) * segmentAngle;
    // Land the winner's center under the pointer at the top (270° in SVG space).
    const current = rotationRef.current;
    const delta = (((270 - winnerCenter) % 360) - (current % 360) + 720) % 360;
    const target = current + SPIN_TURNS * 360 + delta;
    rotationRef.current = target;
    setResult(null);
    setSpinning(true);
    setRotation(target);
    window.setTimeout(() => {
      setSpinning(false);
      setResult(segments[winnerIndex]);
    }, 4800);
  };

  const spinAgain = () => {
    if (!result) {
      spin();
      return;
    }
    // Drop the previous winner so a respin can't land on it again.
    const rest = segments.filter((item) => item.key !== result.key);
    if (rest.length >= 2) {
      setSegments(rest);
    }
    setResult(null);
    // Let the segment change paint before the next spin.
    window.setTimeout(spin, 60);
  };

  const segmentAngle = segments.length > 0 ? 360 / segments.length : 0;

  return (
    <GameShell>
      <div className="wheel">
        <div className="games-head games-head--tight">
          <p className="eyebrow">Колесо вечора</p>
          <h1>Що дивимось сьогодні?</h1>
          <p className="games-lead">
            {usingWatchlist
              ? `У колі ${segments.length} тайтлів зі списку «Хочу подивитись». Довірся долі.`
              : "Твій список «Хочу подивитись» поки порожній — крутимо популярне."}
          </p>
        </div>

        {segments.length < 2 ? (
          <div className="games-loading">Збираємо колесо…</div>
        ) : (
          <div className="wheel__stage">
            <div className="wheel__disc-wrap">
              <span className="wheel__pointer" aria-hidden="true" />
              <svg
                className={`wheel__disc${spinning ? " is-spinning" : ""}`}
                viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
                style={{ transform: `rotate(${rotation}deg)` }}
                role="img"
                aria-label="Колесо фортуни зі збереженими тайтлами"
              >
                {/* Each segment is its own poster, clipped by the wedge: the
                    wheel shows what is actually in the pool instead of eight
                    flat colours. */}
                <defs>
                  {segments.map((item, index) =>
                    item.posterUrl ? (
                      <pattern
                        key={item.key}
                        id={`wheel-poster-${index}`}
                        patternUnits="userSpaceOnUse"
                        x="0"
                        y="0"
                        width={WHEEL_SIZE}
                        height={WHEEL_SIZE}
                      >
                        <image
                          href={item.posterUrl}
                          x="0"
                          y="0"
                          width={WHEEL_SIZE}
                          height={WHEEL_SIZE}
                          preserveAspectRatio="xMidYMid slice"
                        />
                      </pattern>
                    ) : null
                  )}
                </defs>
                {segments.map((item, index) => {
                  const a0 = index * segmentAngle;
                  const a1 = (index + 1) * segmentAngle;
                  const mid = (a0 + a1) / 2;
                  return (
                    <g key={item.key}>
                      <path
                        d={segmentPath(a0, a1)}
                        fill={
                          item.posterUrl
                            ? `url(#wheel-poster-${index})`
                            : PALETTE[index % PALETTE.length]
                        }
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="1"
                      />
                      {/* Tint keeps the label readable over any poster. */}
                      <path
                        d={segmentPath(a0, a1)}
                        fill={PALETTE[index % PALETTE.length]}
                        fillOpacity={item.posterUrl ? 0.62 : 0}
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="1"
                      />
                      <text
                        x={RADIUS + RADIUS * 0.62 * Math.cos((mid * Math.PI) / 180)}
                        y={RADIUS + RADIUS * 0.62 * Math.sin((mid * Math.PI) / 180)}
                        transform={`rotate(${mid} ${
                          RADIUS + RADIUS * 0.62 * Math.cos((mid * Math.PI) / 180)
                        } ${RADIUS + RADIUS * 0.62 * Math.sin((mid * Math.PI) / 180)})`}
                        className="wheel__label"
                      >
                        {truncate(item.title)}
                      </text>
                    </g>
                  );
                })}
                <circle
                  cx={RADIUS}
                  cy={RADIUS}
                  r={RADIUS * 0.16}
                  className="wheel__hub"
                />
              </svg>
              <button
                type="button"
                className="wheel__spin"
                onClick={spin}
                disabled={spinning}
              >
                {spinning ? "…" : "Крутнути"}
              </button>
            </div>

            <div className="wheel__side">
              {result ? (
                <div className="wheel__result">
                  <Confetti />
                  <p className="games-kicker">Сьогодні дивишся</p>
                  <div className="wheel__result-poster">
                    {result.posterUrl ? (
                      <CoverImage
                        src={result.posterUrl}
                        alt={result.title}
                        sizes="(max-width: 640px) 50vw, 220px"
                        priority
                      />
                    ) : (
                      <span>{result.title.slice(0, 1)}</span>
                    )}
                  </div>
                  <strong className="wheel__result-title">
                    {result.title}
                    {result.year ? ` · ${result.year}` : ""}
                  </strong>
                  <div className="wheel__result-actions">
                    <button
                      type="button"
                      className="primary"
                      onClick={() =>
                        router.push(`/title/${result.mediaType}/${result.tmdbId}`)
                      }
                    >
                      Дивлюсь сьогодні →
                    </button>
                    <button type="button" onClick={spinAgain}>
                      Крутнути ще
                    </button>
                  </div>
                </div>
              ) : (
                <div className="wheel__idle">
                  <p>
                    {spinning
                      ? "Колесо вирішує твою долю…"
                      : "Крутни колесо — і питання «що подивитись» вирішено."}
                  </p>
                  {!spinning && source.length > MAX_SEGMENTS ? (
                    <button type="button" className="wheel__reshuffle" onClick={reshuffle}>
                      Перемішати колесо
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </GameShell>
  );
}
