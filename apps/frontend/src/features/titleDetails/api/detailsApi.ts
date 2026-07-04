"use client";

import { requestApi } from "../../../shared/api/http";
import type { Details, ReleaseInfo, Suggestion } from "../../../shared/lib/release";

export type DetailsPayload = {
  details: Details;
  release?: ReleaseInfo;
  recommendations?: Suggestion[];
};

type DetailsResponse = {
  ok: boolean;
  payload: DetailsPayload | null;
};

export async function fetchDetails(
  id: number,
  mediaType: string,
  signal?: AbortSignal
): Promise<DetailsResponse> {
  const response = await requestApi<DetailsPayload>({
    url: "/api/details",
    method: "GET",
    params: { tmdbId: id, mediaType },
    signal,
  });

  return {
    ok: response.ok,
    payload: response.payload,
  };
}
