"use client";

import { requestApi } from "../../../shared/api/http";
import type { Suggestion } from "../../../shared/lib/release";

export type DiscoverPayload = {
  results: Suggestion[];
  page: number;
  hasMore: boolean;
};

export async function fetchDiscoverResults(
  genres: string[],
  countries: string[],
  page: number,
  signal?: AbortSignal
): Promise<DiscoverPayload> {
  const response = await requestApi<DiscoverPayload>({
    url: "/api/discover",
    method: "GET",
    params: {
      genres: genres.join(",") || undefined,
      countries: countries.join(",") || undefined,
      page,
    },
    signal,
  });

  if (!response.ok || !response.payload) {
    throw new Error("Не вдалося завантажити добірку");
  }

  return response.payload;
}
