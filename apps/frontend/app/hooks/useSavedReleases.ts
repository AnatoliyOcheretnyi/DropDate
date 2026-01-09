"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReleaseInfo, Suggestion } from "../../lib/release";
import {
  STORAGE_KEY,
  type SavedRelease,
  getSuggestionId,
  savedIdentifier,
} from "../lib/releases";
import { copy } from "../../lib/strings";
import { useAuth } from "../state/auth";

const remoteState: {
  token: string | null;
  data: SavedRelease[] | null;
  promise: Promise<SavedRelease[] | null> | null;
} = {
  token: null,
  data: null,
  promise: null,
};

const readSavedFromStorage = (): SavedRelease[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as SavedRelease[];
    }
  } catch {
    // ignore malformed storage
  }
  return [];
};

const mergeSaved = (localItems: SavedRelease[], remoteItems: SavedRelease[]) => {
  const map = new Map<string, SavedRelease>();
  remoteItems.forEach((item) => {
    map.set(item.id, item);
  });
  localItems.forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
};

export function useSavedReleases() {
  const [saved, setSaved] = useState<SavedRelease[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user, accessToken } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setSaved(readSavedFromStorage());
    setIsReady(true);
  }, []);

  const isAuthed = Boolean(user && accessToken);

  useEffect(() => {
    if (!isAuthed) {
      return;
    }
    let isMounted = true;
    const loadRemote = async (): Promise<SavedRelease[] | null> => {
      const localSnapshot = readSavedFromStorage();
      try {
        const response = await fetch("/api/saved", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        const payload = await response
          .json()
          .catch(() => ({ items: [] as SavedRelease[] }));
        if (!response.ok) {
          return;
        }
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const normalizedRemote = items.map((item: SavedRelease) => ({
          ...item,
          id: savedIdentifier({
            title: item.title,
            type: item.type,
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
          }),
        }));
        const merged = mergeSaved(localSnapshot, normalizedRemote);
        if (isMounted) {
          setSaved(merged);
        }
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
        remoteState.data = merged;

        const localToSync = localSnapshot.filter(
          (item) => item.tmdbId && item.mediaType
        );
        if (localToSync.length > 0) {
          await Promise.all(
            localToSync.map((item) =>
              fetch("/api/saved", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  tmdbId: item.tmdbId,
                  mediaType: item.mediaType,
                  title: item.title,
                  nextRelease: item.nextRelease,
                  status: item.status,
                  posterUrl: item.posterUrl,
                  backdropUrl: item.backdropUrl,
                }),
              }).catch(() => null)
            )
          );
        }
        return merged;
      } catch {
        // ignore remote errors
        return localSnapshot;
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };
    if (accessToken) {
      if (remoteState.token === accessToken && remoteState.data) {
        setSaved(remoteState.data);
        setIsReady(true);
      } else if (remoteState.token === accessToken && remoteState.promise) {
        remoteState.promise
          .then((data) => {
            if (isMounted && data) {
              setSaved(data);
              setIsReady(true);
            }
          })
          .catch(() => null);
      } else {
        remoteState.token = accessToken;
        remoteState.promise = loadRemote();
        remoteState.promise
          .then((data) => {
            if (data) {
              remoteState.data = data;
            }
            if (isMounted && data) {
              setSaved(data);
            }
          })
          .catch(() => null)
          .finally(() => {
            remoteState.promise = null;
          });
      }
    }
    return () => {
      isMounted = false;
    };
  }, [accessToken, isAuthed]);

  const persist = useCallback(
    (updater: (list: SavedRelease[]) => SavedRelease[]) => {
      setSaved((prev) => {
        const next = updater(prev);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {
            // ignore write errors
          }
        }
        if (isAuthed && accessToken && remoteState.token === accessToken) {
          remoteState.data = next;
        }
        return next;
      });
    },
    [accessToken, isAuthed]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const clearHandler = () => {
      setSaved([]);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    };
    window.addEventListener("saved:clear", clearHandler);
    return () => {
      window.removeEventListener("saved:clear", clearHandler);
    };
  }, []);

  const addRelease = useCallback(
    (release: ReleaseInfo, meta?: { tmdbId?: number; mediaType?: Suggestion["mediaType"] }) => {
      const id = savedIdentifier({
        title: release.title,
        type: release.type,
        tmdbId: meta?.tmdbId,
        mediaType: meta?.mediaType,
      });
      persist((prev) => {
        if (prev.some((item) => item.id === id)) {
          return prev;
        }
        return [...prev, { ...release, id, ...meta }];
      });
      if (isAuthed && meta?.tmdbId && meta?.mediaType) {
        fetch("/api/saved", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
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
          }),
        }).catch(() => null);
      }
    },
    [accessToken, isAuthed, persist]
  );

  const removeRelease = useCallback(
    (id: string) => {
      const target = saved.find((item) => item.id === id);
      persist((prev) => prev.filter((item) => item.id !== id));
      if (isAuthed && target?.tmdbId && target.mediaType) {
        const params = new URLSearchParams({
          tmdbId: String(target.tmdbId),
          mediaType: target.mediaType,
        });
        fetch(`/api/saved/items?${params.toString()}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch(() => null);
      }
    },
    [accessToken, isAuthed, persist, saved]
  );

  const isReleaseSaved = useCallback(
    (
      release: ReleaseInfo | null,
      meta?: { tmdbId?: number; mediaType?: Suggestion["mediaType"] }
    ) => {
      if (!release) {
        return false;
      }
      const id = savedIdentifier({
        title: release.title,
        type: release.type,
        tmdbId: meta?.tmdbId,
        mediaType: meta?.mediaType,
      });
      return saved.some((item) => item.id === id);
    },
    [saved]
  );

  const isSuggestionSaved = useCallback(
    (suggestion: Suggestion) => {
      const id = getSuggestionId(suggestion);
      return saved.some((item) => item.id === id);
    },
    [saved]
  );

  const refreshAll = useCallback(async () => {
    if (saved.length === 0) {
      return { results: [] as BulkRefreshResult[] };
    }

    setIsRefreshing(true);
    try {
      const response = await fetch("/api/bulk-refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: saved.map((item) => ({
            clientId: item.id,
            title: item.title,
          })),
        }),
      });

      const payload = await response
        .json()
        .catch(() => ({ message: copy.errors.invalidJson }));

      if (!response.ok) {
        throw new Error(payload?.message || copy.errors.refreshFailed);
      }

      const results: BulkRefreshResult[] = Array.isArray(payload?.results)
        ? payload.results
        : [];
      const updates = new Map<string, ReleaseInfo>();
      results.forEach((entry) => {
        if (entry.clientId && entry.info) {
          updates.set(entry.clientId, entry.info);
        }
      });

      if (updates.size > 0) {
        persist((prev) =>
          prev.map((item) => {
            const nextInfo = updates.get(item.id);
            return nextInfo ? { ...nextInfo, id: item.id } : item;
          })
        );
      }

      return { results };
    } catch (error) {
      throw error instanceof Error ? error : new Error(copy.errors.refreshFailed);
    } finally {
      setIsRefreshing(false);
    }
  }, [persist, saved]);

  const savedCount = useMemo(() => saved.length, [saved.length]);

  return {
    saved,
    savedCount,
    isReady,
    addRelease,
    removeRelease,
    isReleaseSaved,
    isSuggestionSaved,
    refreshAll,
    isRefreshing,
  };
}

type BulkRefreshResult = {
  clientId: string;
  info?: ReleaseInfo;
  error?: string;
};
