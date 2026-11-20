import { create } from "zustand";

import type {
  Details,
  ReleaseInfo,
  Suggestion,
} from "../../../shared/types/release";
import type { ListType } from "../../../shared/types/lists";
import {
  storageGetString,
  storageSetString,
  storageKeys,
} from "../../../shared/utils/storage";

export type SavedItem = ReleaseInfo & {
  id: string;
  tmdbId: number;
  mediaType: Suggestion["mediaType"];
  savedAt: number;
  details?: Details;
  listTypes: ListType[];
  userRating?: number;
  watchCount?: number;
  lastWatchedAt?: string;
  /** TMDB genres captured server-side; drives the genre chips. */
  genres?: string[];
};

type SavedState = {
  saved: SavedItem[];
  isLoading: boolean;
  addRelease: (
    release: ReleaseInfo,
    meta: {
      tmdbId: number;
      mediaType: Suggestion["mediaType"];
      details?: Details;
    },
    listTypes?: ListType[],
  ) => Promise<void>;
  setListTypes: (
    item: Suggestion,
    listTypes: ListType[],
    meta?: { release?: ReleaseInfo; details?: Details },
  ) => Promise<void>;
  removeRelease: (id: string, listType?: ListType) => Promise<void>;
  isSuggestionSaved: (suggestion: Suggestion) => boolean;
  findByTmdbId: (
    tmdbId: number,
    mediaType: Suggestion["mediaType"],
  ) => SavedItem | undefined;
  getListTypes: (suggestion: Suggestion) => ListType[];
  updateStats: (
    item: Suggestion,
    listType: ListType,
    stats: { userRating?: number; watchCount?: number; lastWatchedAt?: string },
  ) => Promise<void>;
};

const buildSavedId = (tmdbId: number, mediaType: Suggestion["mediaType"]) =>
  `${mediaType}:${tmdbId}`;
const STORAGE_KEY = storageKeys.guestSaved;

const normalizeListTypes = (listTypes?: ListType[]) => {
  if (!listTypes || listTypes.length === 0) {
    return ["follow"] as ListType[];
  }
  const unique = Array.from(new Set(listTypes));
  return unique as ListType[];
};

// Guest data is hydrated once. Re-reading it in every useSaved consumer
// produced fresh arrays on mount and recursively remounted feed headers.
function readGuestSaved(): SavedItem[] {
  try {
    const items: unknown = JSON.parse(storageGetString(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(items)) return [];
    return items.filter(
      (item): item is SavedItem =>
        item != null &&
        typeof item.id === "string" &&
        Number.isFinite(item.tmdbId) &&
        (item.mediaType === "movie" || item.mediaType === "tv") &&
        Array.isArray(item.listTypes),
    );
  } catch {
    return [];
  }
}

// Account data belongs exclusively to React Query and the authenticated API.
export const useSavedStore = create<SavedState>((set, get) => ({
  saved: readGuestSaved(),
  isLoading: false,
  addRelease: async (release, meta, listTypes = ["follow"]) => {
    const id = buildSavedId(meta.tmdbId, meta.mediaType);
    const normalized = normalizeListTypes(listTypes);
    set((state) => {
      const existing = state.saved.find((item) => item.id === id);
      if (existing) {
        const merged = Array.from(
          new Set([...existing.listTypes, ...normalized]),
        ) as ListType[];
        const next = state.saved.map((item) =>
          item.id === id ? { ...item, listTypes: merged } : item,
        );
        storageSetString(STORAGE_KEY, JSON.stringify(next));
        return { saved: next };
      }
      const next = [
        ...state.saved,
        {
          ...release,
          id,
          tmdbId: meta.tmdbId,
          mediaType: meta.mediaType,
          savedAt: Date.now(),
          details: meta.details,
          listTypes: normalized,
        },
      ];
      storageSetString(STORAGE_KEY, JSON.stringify(next));
      return { saved: next };
    });
  },
  removeRelease: async (id, listType) => {
    const existing = get().saved.find((item) => item.id === id);
    if (!existing) {
      return;
    }
    set((state) => {
      if (!listType) {
        const next = state.saved.filter((item) => item.id !== id);
        storageSetString(STORAGE_KEY, JSON.stringify(next));
        return { saved: next };
      }
      const next = state.saved
        .map((item) =>
          item.id === id
            ? {
                ...item,
                listTypes: item.listTypes.filter((t) => t !== listType),
              }
            : item,
        )
        .filter((item) => item.listTypes.length > 0);
      storageSetString(STORAGE_KEY, JSON.stringify(next));
      return { saved: next };
    });
  },
  isSuggestionSaved: (suggestion) => {
    const id = buildSavedId(suggestion.id, suggestion.mediaType);
    return get().saved.some((item) => item.id === id);
  },
  findByTmdbId: (tmdbId, mediaType) =>
    get().saved.find(
      (item) => item.tmdbId === tmdbId && item.mediaType === mediaType,
    ),
  getListTypes: (suggestion) => {
    const id = buildSavedId(suggestion.id, suggestion.mediaType);
    const match = get().saved.find((item) => item.id === id);
    return match ? normalizeListTypes(match.listTypes) : [];
  },
  updateStats: async (item, listType, stats) => {
    const id = buildSavedId(item.id, item.mediaType);
    set((state) => {
      const next = state.saved.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              userRating: stats.userRating ?? entry.userRating,
              watchCount: stats.watchCount ?? entry.watchCount,
              lastWatchedAt: stats.lastWatchedAt ?? entry.lastWatchedAt,
            }
          : entry,
      );
      storageSetString(STORAGE_KEY, JSON.stringify(next));
      return { saved: next };
    });
  },
  setListTypes: async (item, listTypes, meta) => {
    const existing = get().findByTmdbId(item.id, item.mediaType);
    const current = existing ? normalizeListTypes(existing.listTypes) : [];
    const next = Array.from(new Set(listTypes));
    const toAdd = next.filter((t) => !current.includes(t));
    const toRemove = current.filter((t) => !next.includes(t));

    if (meta?.release) {
      for (const listType of toAdd) {
        await get().addRelease(
          meta.release,
          { tmdbId: item.id, mediaType: item.mediaType, details: meta.details },
          [listType],
        );
      }
    }
    for (const listType of toRemove) {
      await get().removeRelease(
        buildSavedId(item.id, item.mediaType),
        listType,
      );
    }
  },
}));

export const useSaved = useSavedStore;
