import type { SavedRelease } from "../../shared/types/releases";

export type WheelFilters = { movies: boolean; series: boolean; query: string; genre: string; maxRuntime: number; releasedOnly: boolean };
export const defaultWheelFilters: WheelFilters = { movies: true, series: true, query: "", genre: "", maxRuntime: 0, releasedOnly: false };

export function wheelPool(saved: SavedRelease[], filters: WheelFilters) {
  const seen = new Set<string>();
  return saved.filter((item) => {
    const mediaType = item.mediaType ?? (item.type === "movie" ? "movie" : "tv");
    const key = `${mediaType}:${item.tmdbId}`;
    if (!item.tmdbId || !item.listTypes?.includes("watchlist") || seen.has(key)) return false;
    if (mediaType === "movie" ? !filters.movies : !filters.series) return false;
    if (filters.query && !item.title.toLocaleLowerCase("uk").includes(filters.query.trim().toLocaleLowerCase("uk"))) return false;
    if (filters.genre && !item.genres?.includes(filters.genre)) return false;
    if (filters.maxRuntime && (!item.runtimeMinutes || item.runtimeMinutes > filters.maxRuntime)) return false;
    if (filters.releasedOnly && item.status === "upcoming") return false;
    seen.add(key);
    return true;
  }).map((item) => ({
    key: `${item.mediaType ?? (item.type === "movie" ? "movie" : "tv")}:${item.tmdbId}`,
    tmdbId: item.tmdbId!,
    mediaType: item.mediaType ?? (item.type === "movie" ? "movie" as const : "tv" as const),
    title: item.title,
    posterUrl: item.posterUrl,
  }));
}
