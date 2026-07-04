"use client";

import { requestApi } from "../../../shared/api/http";
import type { Suggestion } from "../../../shared/lib/release";

export type HomeSections = {
  upcoming: Suggestion[];
  popularMovies: Suggestion[];
  popularSeries: Suggestion[];
  topRated: Suggestion[];
};

type HomePayload = {
  upcoming?: { movies?: Suggestion[]; series?: Suggestion[] };
  popular?: { movies?: Suggestion[]; series?: Suggestion[] };
  topRated?: { movies?: Suggestion[]; series?: Suggestion[] };
};

const mixSuggestions = (movies: Suggestion[], series: Suggestion[]) => {
  const mixed: Suggestion[] = [];
  const max = Math.max(movies.length, series.length);
  for (let i = 0; i < max; i += 1) {
    if (movies[i]) mixed.push(movies[i]);
    if (series[i]) mixed.push(series[i]);
  }
  return mixed;
};

export async function fetchHomeSections(signal?: AbortSignal): Promise<HomeSections> {
  const response = await requestApi<HomePayload>({
    url: "/api/home",
    method: "GET",
    params: { limit: 18 },
    signal,
  });

  if (!response.ok || !response.payload) {
    throw new Error("Не вдалося завантажити головну");
  }

  const upcomingMovies = response.payload.upcoming?.movies ?? [];
  const upcomingSeries = response.payload.upcoming?.series ?? [];
  const popularMovies = response.payload.popular?.movies ?? [];
  const popularSeries = response.payload.popular?.series ?? [];
  const topRatedMovies = response.payload.topRated?.movies ?? [];
  const topRatedSeries = response.payload.topRated?.series ?? [];

  return {
    upcoming: mixSuggestions(upcomingMovies, upcomingSeries),
    popularMovies,
    popularSeries,
    topRated: mixSuggestions(topRatedMovies, topRatedSeries),
  };
}

export async function pingBackend(signal?: AbortSignal) {
  const response = await requestApi({
    url: "/api/health",
    method: "GET",
    signal,
  });
  return response.ok;
}
