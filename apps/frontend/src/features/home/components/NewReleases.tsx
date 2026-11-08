"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Suggestion } from "../../../shared/lib/release";
import type { ListType } from "../../../shared/types/releases";

import { copy } from "../../../shared/lib/strings";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { MovieInfoButton } from "../../../shared/ui/MovieInfoButton";

type TabId = "all" | "movie" | "tv" | "anime";

type Props = {
  movies: Suggestion[];
  series: Suggestion[];
  isLoading: boolean;
  getListTypes: (suggestion: Suggestion) => ListType[];
  onChangeLists: (suggestion: Suggestion, next: ListType[]) => void;
  onSelect: (suggestion: Suggestion) => void;
};

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "Усе" },
  { id: "movie", label: "Фільми" },
  { id: "tv", label: "Серіали" },
  { id: "anime", label: "Аніме" },
];

const VISIBLE = 6;

const interleave = (movies: Suggestion[], series: Suggestion[]) => {
  const out: Suggestion[] = [];
  const max = Math.max(movies.length, series.length);
  for (let i = 0; i < max; i += 1) {
    if (movies[i]) out.push(movies[i]);
    if (series[i]) out.push(series[i]);
  }
  return out;
};

function PosterCard({
  item,
  activeLists,
  onChangeLists,
  onSelect,
}: {
  item: Suggestion;
  activeLists: ListType[];
  onChangeLists: (next: ListType[]) => void;
  onSelect: () => void;
}) {
  return (
    <article className="new-release">
      <button
        type="button"
        className="new-release__poster"
        onClick={onSelect}
        aria-label={item.title}
      >
        {item.posterUrl ? (
          <CoverImage
            src={item.posterUrl}
            alt=""
            sizes="(max-width: 900px) 45vw, 220px"
            ariaHidden
          />
        ) : (
          <span className="new-release__fallback" aria-hidden="true">
            {item.title.slice(0, 1)}
          </span>
        )}
      </button>

      {/* The poster carries no list actions any more -- it is only a way in.
          Everything you can do to a title lives in the preview behind ⓘ. */}
      <MovieInfoButton
        className="new-release__info"
        tmdbId={item.id}
        mediaType={item.mediaType}
        title={item.title}
        onActivate={onSelect}
        activeLists={activeLists}
        onChangeLists={onChangeLists}
      />

      <h3 className="new-release__title">{item.title}</h3>
      <p className="new-release__meta">
        {item.mediaType === "movie"
          ? copy.mediaType.movie
          : copy.mediaType.series}
        {item.year ? ` · ${item.year}` : ""}
      </p>
    </article>
  );
}

export function NewReleases({ getListTypes, onChangeLists, onSelect }: Props) {
  const [tab, setTab] = useState<TabId>("all");

  const recentQuery = useQuery({
    queryKey: ["new-releases"],
    staleTime: 30 * 60 * 1000,
    queryFn: async ({
      signal,
    }): Promise<{
      movies: Suggestion[];
      series: Suggestion[];
      anime: Suggestion[];
    }> => {
      const response = await fetch("/api/new-releases", { signal });
      if (!response.ok) throw new Error("Не вдалося завантажити новинки");
      return response.json();
    },
  });
  const items = useMemo(() => {
    const data = recentQuery.data;
    if (!data) return [];
    if (tab === "movie") return data.movies;
    if (tab === "tv") return data.series;
    if (tab === "anime") return data.anime;
    return interleave(data.movies, data.series);
  }, [tab, recentQuery.data]);

  const visible = items.slice(0, VISIBLE);
  const showSkeleton = recentQuery.isLoading;

  return (
    <section
      className="new-releases trend-bleed"
      aria-labelledby="new-releases-title"
    >
      <div className="trend-inner">
        <header className="new-releases__head">
          <div>
            <p className="new-releases__kicker">
              ПРЕМ’ЄРИ ОСТАННІХ ТРЬОХ МІСЯЦІВ
            </p>
            <h2 id="new-releases-title" className="new-releases__title">
              Нові релізи
            </h2>
          </div>
          <div
            className="new-releases__tabs"
            role="tablist"
            aria-label="Фільтр релізів"
          >
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`new-releases__tab${tab === item.id ? " is-active" : ""}`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <div className="new-releases__grid">
          {showSkeleton
            ? Array.from({ length: VISIBLE }).map((_, index) => (
                <span
                  key={index}
                  className="new-release new-release--skeleton"
                />
              ))
            : visible.map((item) => {
                return (
                  <PosterCard
                    key={`${item.mediaType}-${item.id}`}
                    item={item}
                    activeLists={getListTypes(item)}
                    onSelect={() => onSelect(item)}
                    onChangeLists={(next) => onChangeLists(item, next)}
                  />
                );
              })}
        </div>

        {!showSkeleton && visible.length === 0 ? (
          <p className="new-releases__empty">
            {recentQuery.error
              ? "Не вдалося завантажити новинки. Спробуй пізніше."
              : "Тут поки порожньо — спробуй інший фільтр."}
          </p>
        ) : null}
      </div>
    </section>
  );
}
