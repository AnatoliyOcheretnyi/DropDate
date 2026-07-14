"use client";

import { requestApi, webApi } from "../../../shared/api/http";
import type { ReleaseInfo, Suggestion } from "../../../shared/lib/release";
import type { UnlockedAchievement } from "../../../shared/lib/achievements";
import type { ListType, SavedRelease } from "../../../shared/types/releases";

export type BulkRefreshResult = {
  clientId: string;
  info?: ReleaseInfo;
  error?: string;
};

export async function fetchSavedRemote(
  accessToken: string,
  signal?: AbortSignal
): Promise<SavedRelease[]> {
  const response = await requestApi<{ items?: SavedRelease[] }>({
    url: "/api/saved",
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });

  if (!response.ok) {
    throw new Error("Не вдалося завантажити збережене");
  }

  return Array.isArray(response.payload?.items) ? response.payload.items : [];
}

export async function createSavedRemote(
  accessToken: string,
  payload: {
    tmdbId: number;
    mediaType: Suggestion["mediaType"];
    title: string;
    nextRelease: string;
    status: ReleaseInfo["status"];
    posterUrl?: string;
    backdropUrl?: string;
    listType: ListType;
  }
): Promise<UnlockedAchievement[]> {
  const response = await webApi.post<{
    unlockedAchievements?: UnlockedAchievement[];
  }>("/api/saved", payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data?.unlockedAchievements ?? [];
}

export async function removeSavedRemote(
  accessToken: string,
  payload: {
    tmdbId: number;
    mediaType: Suggestion["mediaType"];
    listType?: ListType;
  }
) {
  const params = new URLSearchParams();
  params.set("tmdbId", String(payload.tmdbId));
  params.set("mediaType", payload.mediaType);
  if (payload.listType) {
    params.set("listType", payload.listType);
  }

  await webApi.delete(`/api/saved/items?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function patchSavedStatsRemote(
  accessToken: string,
  payload: {
    tmdbId: number;
    mediaType: Suggestion["mediaType"];
    listType: ListType;
    userRating?: number;
    watchCount?: number;
    lastWatchedAt?: string;
  }
) {
  await webApi.patch("/api/saved/items", payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function bulkRefreshSaved(
  items: SavedRelease[]
): Promise<BulkRefreshResult[]> {
  const response = await requestApi<{ results?: BulkRefreshResult[]; message?: string }>({
    url: "/api/bulk-refresh",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: {
      items: items.map((item) => ({
        clientId: item.id,
        title: item.title,
      })),
    },
  });

  if (!response.ok) {
    throw new Error(response.payload?.message || "Не вдалося оновити список");
  }

  return Array.isArray(response.payload?.results) ? response.payload.results : [];
}
