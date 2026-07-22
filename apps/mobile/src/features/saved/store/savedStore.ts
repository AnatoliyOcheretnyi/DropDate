import { create } from "zustand";

import type {
  Details,
  ReleaseInfo,
  Suggestion,
} from "../../../shared/types/release";
import type { ListType } from "../../../shared/types/lists";
import { getBackendURL } from "../../../shared/utils/config";
import {
  storageGetString,
  storageSetString,
  storageKeys,
} from "../../../shared/utils/storage";
import { useAuthStore } from "../../auth/store/authStore";

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
};

type SavedState = {
  saved: SavedItem[];
  isLoading: boolean;
  refreshFromAuth: () => Promise<void>;
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

export const useSavedStore = create<SavedState>((set, get) => ({
  saved: [],
  isLoading: false,
  refreshFromAuth: async () => {
    const { user, accessToken } = useAuthStore.getState();
    if (user && accessToken) {
      set({ isLoading: true });
      try {
        const response = await fetch(`${getBackendURL()}/saved`, {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const payload = await response.json().catch(() => ({}));
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const normalized = items.map((item: any) => ({
          id: buildSavedId(item.tmdbId, item.mediaType),
          tmdbId: item.tmdbId,
          mediaType: item.mediaType,
          title: item.title,
          nextRelease: item.nextRelease,
          status: item.status,
          posterUrl: item.posterUrl,
          backdropUrl: item.backdropUrl,
          listTypes: normalizeListTypes(item.listTypes as ListType[]),
          userRating: item.userRating ?? undefined,
          watchCount: item.watchCount ?? 0,
          lastWatchedAt: item.lastWatchedAt ?? undefined,
          type: item.type,
          source: item.source,
          savedAt: Date.now(),
        })) as SavedItem[];
        set({ saved: normalized });
      } catch {
        // ignore
      } finally {
        set({ isLoading: false });
      }
      return;
    }

    const raw = storageGetString(STORAGE_KEY);
    if (!raw) {
      set({ saved: [] });
      return;
    }
    try {
      const items = JSON.parse(raw) as SavedItem[];
      set({ saved: items });
    } catch {
      set({ saved: [] });
    }
  },
  addRelease: async (release, meta, listTypes = ["follow"]) => {
    const id = buildSavedId(meta.tmdbId, meta.mediaType);
    const normalized = normalizeListTypes(listTypes);
    const { user, accessToken } = useAuthStore.getState();

    if (user && accessToken) {
      for (const listType of normalized) {
        await fetch(`${getBackendURL()}/saved`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            tmdbId: meta.tmdbId,
            mediaType: meta.mediaType,
            title: release.title,
            nextRelease: release.nextRelease,
            status: release.status,
            posterUrl: release.posterUrl,
            backdropUrl: release.backdropUrl,
            listType,
          }),
        }).catch(() => undefined);
      }
    }

    set((state) => {
      const existing = state.saved.find((item) => item.id === id);
      if (existing) {
        const merged = Array.from(
          new Set([...existing.listTypes, ...normalized]),
        ) as ListType[];
        const next = state.saved.map((item) =>
          item.id === id ? { ...item, listTypes: merged } : item,
        );
        if (!user) {
          storageSetString(STORAGE_KEY, JSON.stringify(next));
        }
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
      if (!user) {
        storageSetString(STORAGE_KEY, JSON.stringify(next));
      }
      return { saved: next };
    });
  },
  removeRelease: async (id, listType) => {
    const existing = get().saved.find((item) => item.id === id);
    if (!existing) {
      return;
    }
    const { user, accessToken } = useAuthStore.getState();
    if (user && accessToken) {
      const params = new URLSearchParams();
      params.set("tmdbId", String(existing.tmdbId));
      params.set("mediaType", existing.mediaType);
      if (listType) {
        params.set("listType", listType);
      }
      await fetch(`${getBackendURL()}/saved/items?${params.toString()}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => undefined);
    }

    set((state) => {
      if (!listType) {
        const next = state.saved.filter((item) => item.id !== id);
        if (!user) {
          storageSetString(STORAGE_KEY, JSON.stringify(next));
        }
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
      if (!user) {
        storageSetString(STORAGE_KEY, JSON.stringify(next));
      }
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
    const { user, accessToken } = useAuthStore.getState();
    if (user && accessToken) {
      await fetch(`${getBackendURL()}/saved/items`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          tmdbId: item.id,
          mediaType: item.mediaType,
          listType,
          ...stats,
        }),
      }).catch(() => undefined);
    }

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
      if (!user) {
        storageSetString(STORAGE_KEY, JSON.stringify(next));
      }
      return { saved: next };
    });
  },
  setListTypes: async (item, listTypes, meta) => {
    const existing = get().findByTmdbId(item.id, item.mediaType);
    const current = existing ? normalizeListTypes(existing.listTypes) : [];
    const next = normalizeListTypes(listTypes);
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
