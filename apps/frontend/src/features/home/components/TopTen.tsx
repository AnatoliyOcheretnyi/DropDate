"use client";
import { MovieInfoButton } from "../../../shared/ui/MovieInfoButton";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Suggestion } from "../../../shared/lib/release";
import { copy } from "../../../shared/lib/strings";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { Icon } from "../../../shared/ui/Icon";

type Props = {
  items: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
};

const SIZE = 10;
const PERIODS = [
  { id: "day", label: "Сьогодні" },
  { id: "week", label: "Цього тижня" },
  { id: "popular", label: "Популярне зараз" },
] as const;

/**
 * The weekly top ten: a ranked, horizontally scrolling row.
 *
 * The rank is the point of the section, so it is drawn as an oversized outlined
 * numeral beside the poster rather than a small badge on it -- the row should be
 * readable as a chart at a glance.
 */
export function TopTen({ items, onSelect }: Props) {
  const [period, setPeriod] = useState<"day" | "week" | "popular">("popular");
  const query = useQuery({
    queryKey: ["home-chart", period],
    queryFn: async ({ signal }) => {
      const endpoint = period === "popular" ? "/api/popular?limit=10" : `/api/trending?window=${period}&limit=10`;
      const response = await fetch(endpoint, { signal });
      if (!response.ok) throw new Error("Чарт тимчасово недоступний");
      const data = await response.json() as { movies: Suggestion[] };
      return data.movies;
    },
    initialData: period === "popular" && items.length ? items : undefined,
    staleTime: 10 * 60_000,
    retry: 1,
  });
  const ranked = (query.data ?? []).slice(0, SIZE);

  return (
    <section className="top-ten trend-bleed" aria-labelledby="top-ten-title">
      <div className="trend-inner">
        <header className="top-ten__head">
          <div>
          <p className="new-releases__kicker">ПОПУЛЯРНЕ В TMDB</p>
          <h2 id="top-ten-title" className="new-releases__title">
            {period === "day" ? "Популярне сьогодні" : period === "week" ? "Популярне цього тижня" : "Популярне зараз"}
          </h2>
          </div>
          <div className="home-periods" role="group" aria-label="Період популярності">
            {PERIODS.map(({ id, label }) => <button type="button" key={id} aria-pressed={period === id} onClick={() => setPeriod(id)}>{label}</button>)}
          </div>
        </header>
        <div aria-live="polite">
        {query.isPending ? <p className="home-collection__status">Завантажуємо чарт…</p> : query.isError ? <p className="home-collection__status">Не вдалося оновити чарт. <button type="button" className="home-collection__retry" onClick={() => void query.refetch()}>Повторити</button></p> : null}
        </div>
        {!query.isPending && !query.isError && ranked.length === 0 ? (
          <div className="section-empty">
            <span className="section-empty__badge" aria-hidden="true">
              <Icon name="chart-no-axes-column" size={20} />
            </span>
            <div className="section-empty__text">
              <strong>Чарт ще формується</strong>
              <p>
                Добірка тимчасово недоступна. Спробуй дослідити кіно за країнами.
              </p>
            </div>
            <Link href="/world" className="section-empty__action">
              <Icon name="history" size={16} />
              <span>Світ кіно</span>
            </Link>
          </div>
        ) : ranked.length > 0 ? (
        <ol className="top-ten__row">
          {ranked.map((item, index) => (
            <li key={`${item.mediaType}-${item.id}`} className="top-ten__item">
              <MovieInfoButton tmdbId={item.id} mediaType={item.mediaType} title={item.title} onActivate={() => onSelect(item)} />
              <button
                type="button"
                className="top-ten__card"
                onClick={() => onSelect(item)}
              >
                <span className="top-ten__figure">
                  <span className="top-ten__rank" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="top-ten__poster">
                    {item.posterUrl ? (
                      <CoverImage
                        src={item.posterUrl}
                        alt=""
                        sizes="(max-width: 900px) 34vw, 150px"
                        ariaHidden
                      />
                    ) : (
                      <span className="top-ten__fallback" aria-hidden="true">
                        {item.title.slice(0, 1)}
                      </span>
                    )}
                  </span>
                </span>
                <span className="top-ten__body">
                  <strong className="top-ten__title">{item.title}</strong>
                  <span className="top-ten__meta">
                    {item.mediaType === "movie"
                      ? copy.mediaType.movie
                      : copy.mediaType.series}
                    {item.year ? ` · ${item.year}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        ) : null}
      </div>
    </section>
  );
}
