import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { Details, ReleaseInfo, Suggestion } from '../types/release';
import type { ListType } from '../types/lists';
import { STATUS_LISTS } from '../types/lists';
import { getBackendURL } from '../utils/config';
import { useAuth } from './AuthContext';
import { storageGetString, storageSetString, storageKeys } from '../utils/storage';

type SavedItem = ReleaseInfo & {
  id: string;
  tmdbId: number;
  mediaType: Suggestion['mediaType'];
  savedAt: number;
  details?: Details;
  listTypes: ListType[];
  userRating?: number;
  watchCount?: number;
  lastWatchedAt?: string;
};

type SavedContextValue = {
  saved: SavedItem[];
  isLoading: boolean;
  addRelease: (
    release: ReleaseInfo,
    meta: { tmdbId: number; mediaType: Suggestion['mediaType']; details?: Details },
    listTypes?: ListType[]
  ) => Promise<void>;
  setListTypes: (item: Suggestion, listTypes: ListType[], meta?: { release?: ReleaseInfo; details?: Details }) => Promise<void>;
  removeRelease: (id: string, listType?: ListType) => Promise<void>;
  isSuggestionSaved: (suggestion: Suggestion) => boolean;
  findByTmdbId: (tmdbId: number, mediaType: Suggestion['mediaType']) => SavedItem | undefined;
  getListTypes: (suggestion: Suggestion) => ListType[];
  updateStats: (
    item: Suggestion,
    listType: ListType,
    stats: { userRating?: number; watchCount?: number; lastWatchedAt?: string }
  ) => Promise<void>;
};

const SavedContext = createContext<SavedContextValue | undefined>(undefined);

const buildSavedId = (tmdbId: number, mediaType: Suggestion['mediaType']) => `${mediaType}:${tmdbId}`;
const STORAGE_KEY = storageKeys.guestSaved;

const normalizeListTypes = (listTypes?: ListType[]) => {
  if (!listTypes || listTypes.length === 0) {
    return ['follow'] as ListType[];
  }
  const unique = Array.from(new Set(listTypes));
  return unique as ListType[];
};

export function SavedProvider({ children }: { children: ReactNode }) {
  const backendURL = useMemo(() => getBackendURL(), []);
  const { accessToken, user } = useAuth();
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadGuest = useCallback(async () => {
    const raw = storageGetString(STORAGE_KEY);
    if (!raw) {
      setSaved([]);
      return;
    }
    try {
      const items = JSON.parse(raw) as SavedItem[];
      setSaved(items);
    } catch {
      setSaved([]);
    }
  }, []);

  const persistGuest = useCallback(async (items: SavedItem[]) => {
    storageSetString(STORAGE_KEY, JSON.stringify(items));
  }, []);

  const loadRemote = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${backendURL}/saved`, {
        headers: {
          accept: 'application/json',
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
      setSaved(normalized);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, backendURL]);

  useEffect(() => {
    if (user) {
      void loadRemote();
    } else {
      void loadGuest();
    }
  }, [loadGuest, loadRemote, user]);

  const addRelease = useCallback(
    async (
      release: ReleaseInfo,
      meta: { tmdbId: number; mediaType: Suggestion['mediaType']; details?: Details },
      listTypes: ListType[] = ['follow']
    ) => {
      const id = buildSavedId(meta.tmdbId, meta.mediaType);
      const normalized = normalizeListTypes(listTypes);

      if (user && accessToken) {
        for (const listType of normalized) {
          await fetch(`${backendURL}/saved`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              accept: 'application/json',
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

      setSaved((prev) => {
        const existing = prev.find((item) => item.id === id);
        if (existing) {
          const merged = Array.from(new Set([...existing.listTypes, ...normalized])) as ListType[];
          const next = prev.map((item) =>
            item.id === id ? { ...item, listTypes: merged } : item
          );
          if (!user) {
            void persistGuest(next);
          }
          return next;
        }
        const next = [
          ...prev,
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
          void persistGuest(next);
        }
        return next;
      });
    },
    [accessToken, backendURL, persistGuest, user]
  );

  const removeRelease = useCallback(
    async (id: string, listType?: ListType) => {
      const existing = saved.find((item) => item.id === id);
      if (!existing) {
        return;
      }
      if (user && accessToken) {
        const params = new URLSearchParams();
        params.set('tmdbId', String(existing.tmdbId));
        params.set('mediaType', existing.mediaType);
        if (listType) {
          params.set('listType', listType);
        }
        await fetch(`${backendURL}/saved/item?${params.toString()}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch(() => undefined);
      }

      setSaved((prev) => {
        if (!listType) {
          const next = prev.filter((item) => item.id !== id);
          if (!user) {
            void persistGuest(next);
          }
          return next;
        }
        const next = prev
          .map((item) =>
            item.id === id
              ? { ...item, listTypes: item.listTypes.filter((t) => t !== listType) }
              : item
          )
          .filter((item) => item.listTypes.length > 0);
        if (!user) {
          void persistGuest(next);
        }
        return next;
      });
    },
    [accessToken, backendURL, persistGuest, saved, user]
  );

  const isSuggestionSaved = useCallback(
    (suggestion: Suggestion) => {
      const id = buildSavedId(suggestion.id, suggestion.mediaType);
      return saved.some((item) => item.id === id);
    },
    [saved]
  );

  const getListTypes = useCallback(
    (suggestion: Suggestion) => {
      const id = buildSavedId(suggestion.id, suggestion.mediaType);
      const match = saved.find((item) => item.id === id);
      return match ? normalizeListTypes(match.listTypes) : [];
    },
    [saved]
  );

  const findByTmdbId = useCallback(
    (tmdbId: number, mediaType: Suggestion['mediaType']) =>
      saved.find((item) => item.tmdbId === tmdbId && item.mediaType === mediaType),
    [saved]
  );

  const updateStats = useCallback(
    async (
      item: Suggestion,
      listType: ListType,
      stats: { userRating?: number; watchCount?: number; lastWatchedAt?: string }
    ) => {
      const id = buildSavedId(item.id, item.mediaType);
      if (user && accessToken) {
        await fetch(`${backendURL}/saved/item`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
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

      setSaved((prev) => {
        const next = prev.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                userRating: stats.userRating ?? entry.userRating,
                watchCount: stats.watchCount ?? entry.watchCount,
                lastWatchedAt: stats.lastWatchedAt ?? entry.lastWatchedAt,
              }
            : entry
        );
        if (!user) {
          void persistGuest(next);
        }
        return next;
      });
    },
    [accessToken, backendURL, persistGuest, user]
  );

  const setListTypes = useCallback(
    async (
      item: Suggestion,
      listTypes: ListType[],
      meta?: { release?: ReleaseInfo; details?: Details }
    ) => {
      const existing = findByTmdbId(item.id, item.mediaType);
      const current = existing ? normalizeListTypes(existing.listTypes) : [];
      const next = normalizeListTypes(listTypes);

      const toAdd = next.filter((t) => !current.includes(t));
      const toRemove = current.filter((t) => !next.includes(t));

      if (meta?.release) {
        for (const listType of toAdd) {
          await addRelease(meta.release, { tmdbId: item.id, mediaType: item.mediaType, details: meta.details }, [
            listType,
          ]);
        }
      }
      for (const listType of toRemove) {
        await removeRelease(buildSavedId(item.id, item.mediaType), listType);
      }
    },
    [addRelease, findByTmdbId, removeRelease]
  );

  const value = useMemo(
    () => ({
      saved,
      isLoading,
      addRelease,
      removeRelease,
      isSuggestionSaved,
      findByTmdbId,
      getListTypes,
      setListTypes,
      updateStats,
    }),
    [
      addRelease,
      findByTmdbId,
      getListTypes,
      isSuggestionSaved,
      isLoading,
      removeRelease,
      saved,
      setListTypes,
      updateStats,
    ]
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved() {
  const actual = useContext(SavedContext);
  if (!actual) {
    throw new Error('SavedContext is missing');
  }
  return actual;
}
