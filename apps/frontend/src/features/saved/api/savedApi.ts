"use client";

import { requestApi } from "../../../shared/api/http";
import { fetchWithAuth, AuthError } from "../../../shared/state/auth";
import { webQueryClient } from "../../../shared/api/queryClient";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { publishUnlocks } from "../../../shared/lib/achievementBus";
import type { ReleaseInfo } from "../../../shared/lib/release";
import type { UnlockedAchievement } from "../../../shared/lib/achievements";
import type { SavedRelease } from "../../../shared/types/releases";
import {
  beginSavedWrite,
  completeSavedWrite,
  failSavedWrite,
  hasPendingSavedWrites,
  useSavedWrites,
  type SavedOperation,
  type SavedWrite,
} from "../store/savedWrites";
import { enqueueSavedWrite } from "../utils/savedWriteQueue";

export type BulkRefreshResult = {
  clientId: string;
  info?: ReleaseInfo;
  error?: string;
};

class SavedRequestError extends Error {
  constructor(public status: number) {
    super(
      status === 401 || status === 403
        ? "Сесія завершилась. Увійди знову та повтори збереження."
        : status === 429
          ? "Забагато запитів. Зачекай хвилину та повтори."
          : status >= 500
            ? "Сервер зараз недоступний. Спробуй повторити трохи пізніше."
            : "Сервер не підтвердив зміни. Спробуй повторити.",
    );
  }
}

async function requestSaved<T>(
  userId: string,
  url: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetchWithAuth(
    url,
    {
      ...init,
      credentials: "include",
      headers: { accept: "application/json", ...init.headers },
    },
    userId,
  );
  if (!response.ok) throw new SavedRequestError(response.status);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function fetchSavedRemote(
  userId: string,
  signal?: AbortSignal,
): Promise<SavedRelease[]> {
  const payload = await requestSaved<{ items: SavedRelease[] }>(
    userId,
    "/api/saved",
    { method: "GET", signal },
  );
  if (!Array.isArray(payload.items))
    throw new Error("Не вдалося завантажити збережене");
  return payload.items;
}

async function sendOperation(write: SavedWrite) {
  const { operation, userId } = write;
  if (operation.kind === "remove") {
    const params = new URLSearchParams({
      tmdbId: String(operation.payload.tmdbId),
      mediaType: operation.payload.mediaType,
    });
    if (operation.payload.listType)
      params.set("listType", operation.payload.listType);
    return requestSaved<void>(userId, `/api/saved/items?${params}`, {
      method: "DELETE",
      keepalive: true,
    });
  }
  return requestSaved<{ unlockedAchievements?: UnlockedAchievement[] }>(
    userId,
    operation.kind === "save" ? "/api/saved" : "/api/saved/items",
    {
      method: operation.kind === "save" ? "POST" : "PATCH",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(operation.payload),
    },
  );
}

function refreshSavedQueries(userId: string) {
  // A partial server snapshot must not erase other optimistic writes.
  if (hasPendingSavedWrites(userId)) return;
  for (const queryKey of [
    webQueryKeys.saved(userId),
    webQueryKeys.notifications(userId),
    webQueryKeys.recommendations(userId),
    webQueryKeys.achievements(userId),
    ["home-collection", userId],
    ["daily-pick-state", userId],
  ]) {
    // Even a first-load query (without cached data) may have started before the
    // write. invalidateQueries alone can reuse that stale in-flight response.
    void webQueryClient.cancelQueries({ queryKey }).then(() => {
      if (!hasPendingSavedWrites(userId)) {
        return webQueryClient.invalidateQueries({ queryKey });
      }
    });
  }
}

function performSavedWrite(
  userId: string,
  title: string,
  operation: SavedOperation,
): Promise<void> {
  // Journal before scheduling, including requests waiting behind another write.
  const write = beginSavedWrite(userId, title, operation);
  void webQueryClient.cancelQueries({ queryKey: webQueryKeys.saved(userId) });
  const key = `${userId}:${operation.payload.mediaType}:${operation.payload.tmdbId}`;
  return enqueueSavedWrite(
    key,
    async () => {
      try {
        const response = await sendOperation(write);
        completeSavedWrite(write.id);
        if (response?.unlockedAchievements)
          publishUnlocks(response.unlockedAchievements);
      } catch (error) {
        const message =
          error instanceof SavedRequestError || error instanceof AuthError
            ? error.message
            : "Не вдалося підтвердити збереження. Перевір з’єднання та повтори.";
        failSavedWrite(write.id, message);
        throw error;
      }
    },
    () => refreshSavedQueries(userId),
  );
}

export function retrySavedWrite(id: string): Promise<void> {
  const write = useSavedWrites
    .getState()
    .writes.find((entry) => entry.id === id && entry.status === "error");
  if (!write) return Promise.resolve();
  return performSavedWrite(write.userId, write.title, write.operation);
}

export function createSavedRemote(
  userId: string,
  payload: Extract<SavedOperation, { kind: "save" }>["payload"],
) {
  return performSavedWrite(userId, payload.title, { kind: "save", payload });
}

export function removeSavedRemote(
  userId: string,
  payload: Extract<SavedOperation, { kind: "remove" }>["payload"],
  title: string,
) {
  return performSavedWrite(userId, title, { kind: "remove", payload });
}

export function patchSavedStatsRemote(
  userId: string,
  payload: Extract<SavedOperation, { kind: "stats" }>["payload"],
  title: string,
) {
  return performSavedWrite(userId, title, { kind: "stats", payload });
}

export async function bulkRefreshSaved(
  items: SavedRelease[],
): Promise<BulkRefreshResult[]> {
  const response = await requestApi<{
    results?: BulkRefreshResult[];
    message?: string;
  }>({
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

  return Array.isArray(response.payload?.results)
    ? response.payload.results
    : [];
}
