"use client";

import { requestApi } from "../../../shared/api/http";
import type { ListProgress } from "../../../shared/lib/achievements";

export async function fetchAchievements(
  accessToken: string,
  signal?: AbortSignal
): Promise<ListProgress[]> {
  const response = await requestApi<{ lists?: ListProgress[] }>({
    url: "/api/achievements",
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });

  if (!response.ok) {
    throw new Error("Не вдалося завантажити досягнення");
  }

  return Array.isArray(response.payload?.lists) ? response.payload.lists : [];
}
