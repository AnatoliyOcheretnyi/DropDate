"use client";
import { MovieInfoButton } from "../../../shared/ui/MovieInfoButton";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { useAuth } from "../../../shared/state/auth";
import { defaultWheelFilters, wheelPool } from "../wheelPool";
import Link from "next/link";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { Confetti } from "../components/Confetti";
import { GameShell } from "../components/GameShell";

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
  const { user } = useAuth();
  const { saved, isReady } = useSavedReleases();
  const [filters, setFilters] = useState(defaultWheelFilters);
  const source = useMemo(() => wheelPool(saved, filters), [saved, filters]);
  const all = useMemo(() => wheelPool(saved, defaultWheelFilters), [saved]);
  const genres = useMemo(() => [...new Set(saved.filter(item => item.listTypes?.includes("watchlist")).flatMap(item => item.genres ?? []))].sort(), [saved]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const segments = useMemo(() => source.filter(item => !excluded.includes(item.key)), [source, excluded]);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<WheelItem | null>(null);
  const rotationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSpinning(false);
    setResult(null);
    setExcluded([]);
  }, [source]);

  const spin = (pool = segments) => {
    if (spinning || !pool.length) return;
    const winnerIndex = Math.floor(Math.random() * pool.length);
    const winner = pool[winnerIndex];
    if (pool.length === 1) { setResult(winner); return; }
    const winnerCenter = (winnerIndex + 0.5) * (360 / pool.length);
    const current = rotationRef.current;
    const delta = (((270 - winnerCenter) % 360) - (current % 360) + 720) % 360;
    const target = current + SPIN_TURNS * 360 + delta;
    rotationRef.current = target;
    setResult(null);
    setSpinning(true);
    setRotation(target);
    timerRef.current = setTimeout(() => { setSpinning(false); setResult(winner); }, 4800);
  };
  const spinAgain = () => {
    const rest = segments.filter(item => item.key !== result?.key);
    if (!rest.length) return;
    if (result) setExcluded(prev => [...prev, result.key]);
    spin(rest);
  };

  const segmentAngle = segments.length > 0 ? 360 / segments.length : 0;

  return (
    <GameShell>
      <div className="wheel">
        <div className="games-head games-head--tight">
          <p className="eyebrow">Колесо вечора</p>
          <h1>Що дивимось сьогодні?</h1>
          <p className="games-lead">
            Усі {all.length} тайтлів із «Хочу подивитись». Кожен має однаковий шанс.
          </p>
        </div>

        <fieldset className="wheel-filters" disabled={spinning}>
          <legend>Що сьогодні дивимося?</legend>
          <label><input type="checkbox" checked={filters.movies} onChange={e => setFilters(prev => ({ ...prev, movies: e.target.checked }))} /> Фільми ({all.filter(item => item.mediaType === "movie").length})</label>
          <label><input type="checkbox" checked={filters.series} onChange={e => setFilters(prev => ({ ...prev, series: e.target.checked }))} /> Серіали ({all.filter(item => item.mediaType === "tv").length})</label>
          <label><input type="checkbox" checked={filters.releasedOnly} onChange={e => setFilters(prev => ({ ...prev, releasedOnly: e.target.checked }))} /> Уже вийшли</label>
          <label>Жанр<select value={filters.genre} onChange={e => setFilters(prev => ({ ...prev, genre: e.target.value }))}><option value="">Усі жанри</option>{genres.map(genre => <option key={genre}>{genre}</option>)}</select></label>
          <label>Тривалість<select value={filters.maxRuntime} onChange={e => setFilters(prev => ({ ...prev, maxRuntime: Number(e.target.value) }))}><option value={0}>Будь-яка</option><option value={90}>До 90 хв</option><option value={120}>До 2 годин</option><option value={180}>До 3 годин</option></select></label>
          <label>Назва<input type="search" value={filters.query} placeholder="Пошук у твоєму списку" onChange={e => setFilters(prev => ({ ...prev, query: e.target.value }))} /></label>
          <button type="button" onClick={() => { setFilters(defaultWheelFilters); setExcluded([]); setResult(null); }}>Скинути</button>
        </fieldset>
        {filters.maxRuntime > 0 ? <p className="games-hint">Тайтли без відомої тривалості приховані. Для серіалів це тривалість епізоду.</p> : null}
        <p className="wheel-pool-count" aria-live="polite">У колесі: {segments.length} з {all.length}{excluded.length ? ` · відкладено: ${excluded.length}` : ""}</p>
        {!user ? <p className="games-error">Увійди через профіль, щоб крутити свій список «Хочу подивитись».</p> : !isReady ? <div className="games-loading">Завантажуємо твій список…</div> : !segments.length ? (
          <div className="games-error">{all.length ? "За цими фільтрами немає тайтлів. Зміни фільтри або скинь вибір." : "Додай фільми чи серіали у «Хочу подивитись», і вони з’являться тут."} <Link href="/saved">До списку →</Link></div>
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
                    item.posterUrl && segments.length <= 24 ? (
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
                    <g key={item.key}><title>{item.title}</title>
                      <path
                        d={segmentPath(a0, a1)}
                        fill={
                          item.posterUrl && segments.length <= 24
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
                        fillOpacity={item.posterUrl && segments.length <= 24 ? 0.62 : 0}
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="1"
                      />
                      {segments.length <= 24 ? <text
                        x={RADIUS + RADIUS * 0.62 * Math.cos((mid * Math.PI) / 180)}
                        y={RADIUS + RADIUS * 0.62 * Math.sin((mid * Math.PI) / 180)}
                        transform={`rotate(${mid} ${
                          RADIUS + RADIUS * 0.62 * Math.cos((mid * Math.PI) / 180)
                        } ${RADIUS + RADIUS * 0.62 * Math.sin((mid * Math.PI) / 180)})`}
                        className="wheel__label"
                      >
                        {truncate(item.title)}
                      </text> : null}
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
                onClick={() => spin()}
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
                    <MovieInfoButton tmdbId={result.tmdbId} mediaType={result.mediaType} title={result.title} />
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
                    <button type="button" onClick={spinAgain} disabled={segments.length <= 1}>
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
                </div>
              )}
            </div>
          </div>
        )}
        {segments.length > 0 ? <details className="wheel-pool-list"><summary>Усі учасники колеса · {segments.length}</summary><ul>{segments.map(item => <li key={item.key}><Link href={`/title/${item.mediaType}/${item.tmdbId}`}>{item.title}</Link><span>{item.mediaType === "movie" ? "Фільм" : "Серіал"}</span></li>)}</ul></details> : null}
      </div>
    </GameShell>
  );
}
