"use client";

import { create } from "zustand";

export type TasteKind = "genre" | "country";

export const DEFAULT_GENRES = [
  "Бойовик",
  "Комедія",
  "Драма",
  "Фантастика",
  "Трилер",
  "Пригоди",
  "Жахи",
  "Романтика",
  "Анімація",
  "Фентезі",
  "Детектив",
  "Документальні",
];

export const DEFAULT_COUNTRIES = [
  "США",
  "Британія",
  "Корея",
  "Японія",
  "Україна",
  "Франція",
  "Іспанія",
  "Індія",
];

const STORAGE_KEY = "dropdate:taste-ranking";

type Stored = { genres?: string[]; countries?: string[] };

const mergeWithDefaults = (stored: string[] | undefined, defaults: string[]) => {
  if (!stored || stored.length === 0) {
    return [...defaults];
  }
  // Keep stored order, then append any new defaults that were not stored yet.
  const missing = defaults.filter((entry) => !stored.includes(entry));
  return [...stored.filter((entry) => defaults.includes(entry)), ...missing];
};

const readFromStorage = (): Stored => {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : {};
  } catch {
    return {};
  }
};

const writeToStorage = (genres: string[], countries: string[]) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ genres, countries })
    );
  } catch {
    // ignore
  }
};

type TasteStore = {
  genres: string[];
  countries: string[];
  isReady: boolean;
  hydrate: () => void;
  reorder: (kind: TasteKind, from: number, to: number) => void;
  reset: (kind: TasteKind) => void;
};

export const useTasteStore = create<TasteStore>((set) => ({
  genres: DEFAULT_GENRES,
  countries: DEFAULT_COUNTRIES,
  isReady: false,
  hydrate: () => {
    const stored = readFromStorage();
    set({
      genres: mergeWithDefaults(stored.genres, DEFAULT_GENRES),
      countries: mergeWithDefaults(stored.countries, DEFAULT_COUNTRIES),
      isReady: true,
    });
  },
  reorder: (kind, from, to) =>
    set((state) => {
      const list = [...(kind === "genre" ? state.genres : state.countries)];
      if (
        from < 0 ||
        from >= list.length ||
        to < 0 ||
        to >= list.length ||
        from === to
      ) {
        return {};
      }
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      const genres = kind === "genre" ? list : state.genres;
      const countries = kind === "country" ? list : state.countries;
      writeToStorage(genres, countries);
      return { genres, countries };
    }),
  reset: (kind) =>
    set((state) => {
      const genres = kind === "genre" ? [...DEFAULT_GENRES] : state.genres;
      const countries =
        kind === "country" ? [...DEFAULT_COUNTRIES] : state.countries;
      writeToStorage(genres, countries);
      return { genres, countries };
    }),
}));
