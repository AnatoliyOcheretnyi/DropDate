import type { WorldItem } from "./types";
export function makeFilmRoute(items: WorldItem[]): WorldItem[] {
  const unique = Array.from(
    new Map(items.map((item) => [item.tmdbId, item])).values(),
  );
  if (unique.length < 3) return [];
  const first = [...unique].sort(
    (a, b) => (b.voteCount ?? 0) - (a.voteCount ?? 0),
  )[0];
  const second = unique
    .filter((i) => i.tmdbId !== first.tmdbId)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
  const third = unique
    .filter((i) => i.tmdbId !== first.tmdbId && i.tmdbId !== second.tmdbId)
    .sort((a, b) => (a.voteCount ?? 0) - (b.voteCount ?? 0))[0];
  return [first, second, third];
}
