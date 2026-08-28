"use client";

import { requestApi } from "../../../shared/api/http";
import type { VibePlan, VibeResponse, VibeVocabulary } from "../types";

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
  return response.payload;
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
  return response.payload;
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
