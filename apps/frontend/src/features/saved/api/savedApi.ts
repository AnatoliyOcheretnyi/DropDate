"use client";

import { requestApi } from "../../../shared/api/http";
import type { ReleaseInfo, Suggestion } from "../../../shared/lib/release";
import type { UnlockedAchievement } from "../../../shared/lib/achievements";
import type { ListType, SavedRelease } from "../../../shared/types/releases";

export type BulkRefreshResult = {
  clientId: string;
  info?: ReleaseInfo;
  error?: string;
};

async function requestSavedMutation<T>(
  url: string,
  init: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    keepalive: true,
    headers: {
      accept: "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const payload = await response
      .json()
      .catch(() => null) as { message?: string; error?: string } | null;
    throw new Error(
      payload?.message || payload?.error || `Saved mutation failed (${response.status})`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

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
  const response = await requestSavedMutation<{
    unlockedAchievements?: UnlockedAchievement[];
  }>("/api/saved", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  return response.unlockedAchievements ?? [];
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

  await requestSavedMutation<void>(`/api/saved/items?${params.toString()}`, {
    method: "DELETE",
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
  await requestSavedMutation<void>("/api/saved/items", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
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
