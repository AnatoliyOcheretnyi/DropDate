"use client";

import type { SearchPayload } from "../types";

type SearchResponse = {
  ok: boolean;
  payload: SearchPayload | null;
};

export async function fetchSearchResults(
  query: string,
  page: number
): Promise<SearchResponse> {
  const response = await fetch(
    `/api/search?query=${encodeURIComponent(query)}&page=${page}`,
    { cache: "no-store" }
  );
  const payload = (await response.json().catch(() => null)) as SearchPayload | null;
  return { ok: response.ok, payload };
}
