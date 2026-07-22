import { apiRequest } from "../../../shared/api/client";
import type { Suggestion } from "../../../shared/types/release";
import { interleaveSuggestions } from "../../../shared/utils/release";
import { getRecommendations } from "../../recommendations/api/recommendations";

export type CollectionId =
  "upcoming" | "popularMovies" | "popularSeries" | "topRated" | "personalized";

type CatalogPayload = { movies?: Suggestion[]; series?: Suggestion[] };

export type CollectionConfig = {
  title: string;
  kicker: string;
  /** Recommendations are per-user, so the screen must gate on auth. */
  requiresAuth?: boolean;
  load: (signal?: AbortSignal) => Promise<Suggestion[]>;
};

/** One page is plenty: these endpoints cap out well below this. */
const PAGE_SIZE = 60;

const catalog = async (path: string, signal?: AbortSignal) =>
  apiRequest<CatalogPayload>(`${path}?limit=${PAGE_SIZE}`, { signal });

export const collectionConfig: Record<CollectionId, CollectionConfig> = {
  upcoming: {
    title: "Скоро в прокаті",
    kicker: "Календар релізів",
    load: async (signal) => {
      const data = await catalog("/upcoming", signal);
      return interleaveSuggestions(data.movies ?? [], data.series ?? []);
    },
  },
  popularMovies: {
    title: "Популярні фільми",
    kicker: "Що дивляться зараз",
    load: async (signal) => (await catalog("/popular", signal)).movies ?? [],
  },
  popularSeries: {
    title: "Популярні серіали",
    kicker: "Серіальний потік",
    load: async (signal) => (await catalog("/popular", signal)).series ?? [],
  },
  topRated: {
    title: "Найвищий рейтинг",
    kicker: "Високі оцінки",
    load: async (signal) => {
      const data = await catalog("/top-rated", signal);
      return interleaveSuggestions(data.movies ?? [], data.series ?? []);
    },
  },
  personalized: {
    title: "Рекомендовано для тебе",
    kicker: "На основі улюблених і переглянутих",
    requiresAuth: true,
    load: async (signal) => {
      const data = await getRecommendations(signal);
      return data.items.map((item) => ({
        id: item.tmdbId,
        mediaType: item.mediaType,
        title: item.title,
        year: item.year,
        posterUrl: item.posterUrl,
      }));
    },
  },
};

export const isCollectionId = (value: unknown): value is CollectionId =>
  typeof value === "string" && value in collectionConfig;
