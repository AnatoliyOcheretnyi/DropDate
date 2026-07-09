"use client";

import type { Suggestion } from "./release";

const CACHE_KEY = "dropdate:cold-start-films:v1";
const MAX_FILMS = 10;

// Shown while the backend wakes up. The backend is asleep at that moment, so the
// list can only come from this device: last visit's top-rated, or this bundled
// snapshot for first-time visitors. Posters load straight from TMDB's CDN.
const FALLBACK_FILMS: Suggestion[] = [
  {
    id: 278,
    title: "Втеча з Шоушенка",
    mediaType: "movie",
    year: "1994",
    posterUrl: "https://image.tmdb.org/t/p/w342/6BRshOK03BnxTedpAhZl2yZBLTY.jpg",
  },
  {
    id: 238,
    title: "Хрещений батько",
    mediaType: "movie",
    year: "1972",
    posterUrl: "https://image.tmdb.org/t/p/w342/3FhQJLfGuN6bplLeeEziAR9nPmV.jpg",
  },
  {
    id: 240,
    title: "Хрещений батько 2",
    mediaType: "movie",
    year: "1974",
    posterUrl: "https://image.tmdb.org/t/p/w342/iYbToXLBnSZ7Q0WniqSlSpzPprs.jpg",
  },
  {
    id: 424,
    title: "Список Шиндлера",
    mediaType: "movie",
    year: "1993",
    posterUrl: "https://image.tmdb.org/t/p/w342/hjYXZcPE3g9cJZJdFtDS5S4xVOr.jpg",
  },
  {
    id: 389,
    title: "12 розгніваних чоловіків",
    mediaType: "movie",
    year: "1957",
    posterUrl: "https://image.tmdb.org/t/p/w342/7bj9HoEWIHfLJ5lc5wv01ALqedJ.jpg",
  },
  {
    id: 129,
    title: "Віднесені привидами",
    mediaType: "movie",
    year: "2001",
    posterUrl: "https://image.tmdb.org/t/p/w342/m8qLMkpEwfgUdi2o1S96N1dIbkJ.jpg",
  },
  {
    id: 155,
    title: "Темний лицар",
    mediaType: "movie",
    year: "2008",
    posterUrl: "https://image.tmdb.org/t/p/w342/hAf98uHIXMFzqNN5LX1vnouCShr.jpg",
  },
  {
    id: 497,
    title: "Зелена миля",
    mediaType: "movie",
    year: "1999",
    posterUrl: "https://image.tmdb.org/t/p/w342/v8IlsbxC1xL3f1jA2jBKWoaTgU8.jpg",
  },
  {
    id: 122,
    title: "Володар перснів: Повернення короля",
    mediaType: "movie",
    year: "2003",
    posterUrl: "https://image.tmdb.org/t/p/w342/8FnpF30xw0MiLjOOal4m6SjOugB.jpg",
  },
];

const hasPoster = (item: Suggestion) => Boolean(item.posterUrl);

export function saveColdStartFilms(items: Suggestion[]) {
  if (typeof window === "undefined") return;
  const usable = items.filter(hasPoster).slice(0, MAX_FILMS);
  if (usable.length === 0) return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(usable));
  } catch {
    // Quota or private mode — the bundled fallback still covers us.
  }
}

export function loadColdStartFilms(): Suggestion[] {
  if (typeof window === "undefined") return FALLBACK_FILMS;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return FALLBACK_FILMS;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return FALLBACK_FILMS;
    const usable = (parsed as Suggestion[]).filter(hasPoster);
    return usable.length > 0 ? usable : FALLBACK_FILMS;
  } catch {
    return FALLBACK_FILMS;
  }
}
