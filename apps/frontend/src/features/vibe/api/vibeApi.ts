"use client";

import { requestApi } from "../../../shared/api/http";
import type { VibePlan, VibeResponse, VibeVocabulary } from "../types";

const asArray = (value: string[] | null | undefined): string[] =>
  Array.isArray(value) ? value : [];

/**
 * Guarantees the plan's lists are lists.
 *
 * A plan with no genres used to arrive as `"genres": null`, and every caller
 * reads them straight off the plan (`plan.genres.includes(...)`) — one null and
 * the chip panel throws. The server sends `[]` now; this keeps a stale response
 * or a cached page from bringing the crash back.
 */
const normalizePlan = (plan: VibePlan): VibePlan => ({
  ...plan,
  themes: asArray(plan?.themes),
  genres: asArray(plan?.genres),
});

const normalizeResponse = (response: VibeResponse): VibeResponse => ({
  ...response,
  plan: normalizePlan(response.plan),
  labels: response.labels ?? [],
  results: response.results ?? [],
});

export async function searchByPhrase(
  phrase: string,
  page = 1,
  signal?: AbortSignal
): Promise<VibeResponse> {
  const response = await requestApi<VibeResponse>({
    url: "/api/vibe",
    method: "POST",
    data: { phrase, page },
    signal,
  });
  if (!response.ok || !response.payload) {
    throw new Error("Не вдалося розібрати запит");
  }
  return normalizeResponse(response.payload);
}

/** Re-runs an edited plan. No interpretation happens, so this is instant. */
export async function searchByPlan(
  plan: VibePlan,
  page = 1,
  signal?: AbortSignal
): Promise<VibeResponse> {
  const response = await requestApi<VibeResponse>({
    url: "/api/vibe/plan",
    method: "POST",
    data: { plan, page },
    signal,
  });
  if (!response.ok || !response.payload) {
    throw new Error("Не вдалося оновити добірку");
  }
  return normalizeResponse(response.payload);
}

export async function fetchVibeVocabulary(
  signal?: AbortSignal
): Promise<VibeVocabulary> {
  const response = await requestApi<VibeVocabulary>({
    url: "/api/vibe/vocabulary",
    method: "GET",
    signal,
  });
  if (!response.ok || !response.payload) {
    throw new Error("Не вдалося завантажити словник тем");
  }
  return response.payload;
}
