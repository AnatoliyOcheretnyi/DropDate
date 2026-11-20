"use client";

import { create } from "zustand";
import type { ListType } from "../../../shared/types/releases";
import type { ReleaseInfo } from "../../../shared/lib/release";

type TitleRef = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  listType?: ListType;
};
export type SavedOperation =
  | {
      kind: "save";
      payload: TitleRef & {
        title: string;
        nextRelease: string;
        status: ReleaseInfo["status"];
        posterUrl?: string;
        backdropUrl?: string;
        listType: ListType;
      };
    }
  | { kind: "remove"; payload: TitleRef }
  | {
      kind: "stats";
      payload: TitleRef & {
        listType: ListType;
        userRating?: number;
        watchCount?: number;
        lastWatchedAt?: string;
      };
    };
export type SavedWrite = {
  id: string;
  key: string;
  userId: string;
  title: string;
  operation: SavedOperation;
  status: "pending" | "error";
  message?: string;
};

export const SAVED_WRITES_KEY = "dropdate:saved-writes:v1";
export const useSavedWrites = create<{
  writes: SavedWrite[];
  hydrated: boolean;
  storageUnavailable: boolean;
}>(() => ({ writes: [], hydrated: false, storageUnavailable: false }));

const listTypes = [
  "follow",
  "watchlist",
  "favorite",
  "liked",
  "watched",
  "disliked",
];
function isSavedWrite(value: unknown): value is SavedWrite {
  if (!value || typeof value !== "object") return false;
  const entry = value as SavedWrite;
  const op = entry.operation;
  const payload = op?.payload;
  return (
    typeof entry.id === "string" &&
    typeof entry.key === "string" &&
    typeof entry.userId === "string" &&
    typeof entry.title === "string" &&
    ["save", "remove", "stats"].includes(op?.kind) &&
    Boolean(payload) &&
    Number.isSafeInteger(payload.tmdbId) &&
    payload.tmdbId > 0 &&
    ["movie", "tv"].includes(payload.mediaType) &&
    (payload.listType === undefined
      ? op.kind === "remove"
      : listTypes.includes(payload.listType)) &&
    (op.kind !== "save" ||
      (typeof op.payload.title === "string" &&
        typeof op.payload.nextRelease === "string"))
  );
}

// Session storage is isolated per tab, survives reload, and never contains
// tokens. Hydration never automatically replays a potentially completed write.
export function hydrateSavedWrites() {
  if (useSavedWrites.getState().hydrated || typeof window === "undefined")
    return;
  try {
    const raw: unknown = JSON.parse(
      sessionStorage.getItem(SAVED_WRITES_KEY) || "[]",
    );
    const writes = Array.isArray(raw)
      ? raw.filter(isSavedWrite).map((entry): SavedWrite => ({
          ...entry,
          status: "error",
          message:
            "Збереження не підтверджене. Перевір список або повтори дію.",
        }))
      : [];
    useSavedWrites.setState({ writes, hydrated: true });
  } catch {
    useSavedWrites.setState({ hydrated: true, storageUnavailable: true });
  }
}

function storeWrites(writes: SavedWrite[]) {
  useSavedWrites.setState({ writes });
  try {
    sessionStorage.setItem(SAVED_WRITES_KEY, JSON.stringify(writes));
    useSavedWrites.setState({ storageUnavailable: false });
  } catch {
    useSavedWrites.setState({ storageUnavailable: true });
  }
}

export function beginSavedWrite(
  userId: string,
  title: string,
  operation: SavedOperation,
) {
  hydrateSavedWrites();
  const { tmdbId, mediaType, listType } = operation.payload;
  const key = `${userId}:${mediaType}:${tmdbId}:${listType ?? "all"}:${operation.kind === "stats" ? "stats" : "membership"}`;
  const write: SavedWrite = {
    id: crypto.randomUUID(),
    key,
    userId,
    title,
    operation,
    status: "pending",
  };
  storeWrites([
    ...useSavedWrites.getState().writes.filter((entry) => {
      if (entry.key === key) return false;
      // A newer verdict supersedes a failed/queued older verdict for this title.
      // Independent follows and necessary removals must still be retained.
      return !(
        operation.kind === "save" &&
        listType !== "follow" &&
        entry.operation.kind === "save" &&
        entry.operation.payload.listType !== "follow" &&
        entry.userId === userId &&
        entry.operation.payload.tmdbId === tmdbId &&
        entry.operation.payload.mediaType === mediaType
      );
    }),
    write,
  ]);
  return write;
}

export function completeSavedWrite(id: string) {
  storeWrites(
    useSavedWrites.getState().writes.filter((entry) => entry.id !== id),
  );
}

export function failSavedWrite(id: string, message: string) {
  storeWrites(
    useSavedWrites
      .getState()
      .writes.map((entry) =>
        entry.id === id ? { ...entry, status: "error", message } : entry,
      ),
  );
}

export function hasPendingSavedWrites(userId: string) {
  return useSavedWrites
    .getState()
    .writes.some(
      (entry) => entry.userId === userId && entry.status === "pending",
    );
}
