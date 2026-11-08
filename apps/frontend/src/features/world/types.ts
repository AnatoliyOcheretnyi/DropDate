export type WorldItem = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year?: string;
  posterUrl?: string;
  rating?: number;
  voteCount?: number;
  reason: string;
  country?: string;
  runtime?: number;
  genres?: string[];
  countries?: string[];
};
export type WorldResult = {
  items: WorldItem[];
  aiUsed: boolean;
  partial: boolean;
  exhausted: boolean;
};
export type Country = {
  code: string;
  name: string;
  lat: number;
  lng: number;
  mapped: boolean;
  polygon: boolean;
};
export const GENRES = [
  [28, "Бойовик"],
  [12, "Пригоди"],
  [16, "Анімація"],
  [35, "Комедія"],
  [80, "Кримінал"],
  [99, "Документальний"],
  [18, "Драма"],
  [10751, "Сімейний"],
  [14, "Фентезі"],
  [36, "Історичний"],
  [27, "Жахи"],
  [9648, "Детектив"],
  [10749, "Романтика"],
  [878, "Фантастика"],
  [53, "Трилер"],
] as const;
export const itemKey = (item: WorldItem) => `${item.mediaType}:${item.tmdbId}`;
