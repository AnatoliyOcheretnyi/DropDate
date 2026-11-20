import { apiRequest } from "../../../shared/api/client";
export type WorldItem = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year?: string;
  posterUrl?: string;
  rating?: number;
  voteCount?: number;
  reason: string;
  runtime?: number;
};
export type WorldResult = {
  items: WorldItem[];
  aiUsed: boolean;
  partial: boolean;
  exhausted: boolean;
};
export type WorldPassport = {
  countries: Record<string, number>;
  totalWatched: number;
  missing: number;
};
export type WorldFilters = {
  country: string;
  mode: string;
  genre: string;
  decade: string;
  runtime: string;
  hideWatched: boolean;
  providers?: number[];
  region?: string;
  seed?: string;
  intent?: string;
};
export function getWorld(
  filters: WorldFilters,
  page: number,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({
    country: filters.country,
    mode: filters.mode,
    page: String(page),
    hideWatched: filters.hideWatched ? "1" : "0",
  });
  for (const key of [
    "genre",
    "decade",
    "runtime",
    "region",
    "seed",
    "intent",
  ] as const)
    if (filters[key]) params.set(key, filters[key]);
  if (filters.providers?.length)
    params.set("providers", filters.providers.join(","));
  return apiRequest<WorldResult>(`/world?${params}`, {
    auth: true,
    signal,
    timeoutMs: 45000,
  });
}
export async function getWorldPassport(
  signal?: AbortSignal,
): Promise<WorldPassport> {
  const result: WorldPassport = { countries: {}, totalWatched: 0, missing: 0 };
  let offset = 0;
  while (true) {
    const page = await apiRequest<WorldPassport & { nextOffset: number }>(
      `/world/passport?offset=${offset}`,
      { auth: true, signal },
    );
    result.totalWatched = page.totalWatched;
    result.missing += page.missing;
    for (const [code, count] of Object.entries(page.countries ?? {}))
      result.countries[code] = (result.countries[code] ?? 0) + count;
    if (page.nextOffset === -1) return result;
    if (
      !Number.isInteger(page.nextOffset) ||
      page.nextOffset <= offset ||
      page.nextOffset >= page.totalWatched
    )
      throw new Error("Не вдалося завантажити весь кінопаспорт");
    offset = page.nextOffset;
  }
}
export function makeFilmRoute(items: WorldItem[]) {
  const unique = [
    ...new Map(items.map((item) => [item.tmdbId, item])).values(),
  ];
  if (unique.length < 3) return [];
  const first = [...unique].sort(
    (a, b) => (b.voteCount ?? 0) - (a.voteCount ?? 0),
  )[0];
  const second = unique
    .filter((i) => i !== first)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
  const third = unique
    .filter((i) => i !== first && i !== second)
    .sort((a, b) => (a.voteCount ?? 0) - (b.voteCount ?? 0))[0];
  return [first, second, third];
}
export const worldFeedback = (item: WorldItem, action: "liked" | "disliked") =>
  apiRequest("/recommendations/feedback", {
    method: "POST",
    auth: true,
    body: { ...item, action },
  });
