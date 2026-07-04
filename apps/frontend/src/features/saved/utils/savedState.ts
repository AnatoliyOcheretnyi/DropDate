"use client";

import type { ReleaseInfo, Suggestion } from "../../../shared/lib/release";
import {
  getSuggestionId,
  savedIdentifier,
  STORAGE_KEY,
  SYNC_ON_AUTH_KEY,
  type ListType,
  type SavedRelease,
} from "../../../shared/types/releases";

const STATUS_LISTS: ListType[] = ["favorite", "watched", "disliked"];

export const normalizeListTypes = (listTypes?: ListType[]) => {
  if (!listTypes) {
    return ["follow"] as ListType[];
  }
  if (listTypes.length === 0) {
    return [];
  }
  const unique = Array.from(new Set(listTypes));
  const statuses = unique.filter((entry) => STATUS_LISTS.includes(entry));
  if (statuses.length > 1) {
    const preferred =
      statuses.find((entry) => entry === "favorite") ||
      statuses.find((entry) => entry === "watched") ||
      statuses[0];
    return unique.filter(
      (entry) => !STATUS_LISTS.includes(entry) || entry === preferred
    );
  }
  return unique;
};

export const normalizeSavedRelease = (
  item: SavedRelease & { listType?: string }
): SavedRelease => ({
  ...item,
  id: savedIdentifier({
    title: item.title,
    type: item.type,
    tmdbId: item.tmdbId,
    mediaType: item.mediaType,
  }),
  listTypes: normalizeListTypes(
    item.listTypes ?? (item.listType ? [item.listType as ListType] : undefined)
  ),
});

export const readSavedFromStorage = (): SavedRelease[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as SavedRelease[];
    return parsed.map((item) => ({
      ...item,
      listTypes: normalizeListTypes(item.listTypes),
    }));
  } catch {
    return [];
  }
};

export const writeSavedToStorage = (saved: SavedRelease[]) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // ignore storage issues
  }
};

export const shouldSyncOnAuth = () => {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(SYNC_ON_AUTH_KEY) === "1";
};

export const clearSyncOnAuth = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(SYNC_ON_AUTH_KEY);
};

export const mergeSaved = (localItems: SavedRelease[], remoteItems: SavedRelease[]) => {
  const map = new Map<string, SavedRelease>();
  remoteItems.forEach((item) => {
    map.set(item.id, {
      ...item,
      listTypes: normalizeListTypes(item.listTypes),
    });
  });

  localItems.forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, {
        ...item,
        listTypes: normalizeListTypes(item.listTypes),
      });
      return;
    }
    const existing = map.get(item.id);
    if (!existing) {
      return;
    }
    const combined = Array.from(
      new Set([
        ...normalizeListTypes(existing.listTypes),
        ...normalizeListTypes(item.listTypes),
      ])
    );
    map.set(item.id, {
      ...existing,
      listTypes: combined,
      userRating:
        typeof existing.userRating === "number"
          ? existing.userRating
          : item.userRating,
      watchCount:
        (existing.watchCount || 0) > 0 ? existing.watchCount : item.watchCount,
      lastWatchedAt: existing.lastWatchedAt || item.lastWatchedAt,
    });
  });

  return Array.from(map.values());
};

export const hasFollowItems = (saved: SavedRelease[]) =>
  saved.some((item) => {
    const listTypes =
      item.listTypes && item.listTypes.length > 0
        ? item.listTypes
        : (["follow"] as ListType[]);
    return listTypes.includes("follow");
  });

export const buildSavedId = (
  release: ReleaseInfo,
  meta?: { tmdbId?: number; mediaType?: Suggestion["mediaType"] }
) =>
  savedIdentifier({
    title: release.title,
    type: release.type,
    tmdbId: meta?.tmdbId,
    mediaType: meta?.mediaType,
  });

export const getSavedListTypes = (
  savedById: Map<string, SavedRelease>,
  suggestion: Suggestion
) => {
  const item = savedById.get(getSuggestionId(suggestion));
  return item ? normalizeListTypes(item.listTypes) : [];
};
