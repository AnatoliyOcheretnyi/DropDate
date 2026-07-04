"use client";

import { requestApi } from "../../../shared/api/http";
import type { SearchPayload } from "../types";

type SearchResponse = {
  ok: boolean;
  payload: SearchPayload | null;
};

export async function fetchSearchResults(
  query: string,
  page: number,
  signal?: AbortSignal
): Promise<SearchResponse> {
  const response = await requestApi<SearchPayload>({
    url: "/api/search",
    method: "GET",
    params: { query, page },
    signal,
  });

  return {
    ok: response.ok,
    payload: response.payload,
  };
}
