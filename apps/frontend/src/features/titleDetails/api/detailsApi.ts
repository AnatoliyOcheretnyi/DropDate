"use client";

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
  mediaType: string
): Promise<DetailsResponse> {
  const response = await fetch(`/api/details?tmdbId=${id}&mediaType=${mediaType}`, {
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as DetailsPayload | null;
  return { ok: response.ok, payload };
}
