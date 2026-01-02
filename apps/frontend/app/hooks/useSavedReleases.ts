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
    const loadRemote = async () => {
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
        if (isMounted) {
          setSaved(
            items.map((item: SavedRelease) => ({
              ...item,
              id: savedIdentifier({
                title: item.title,
                type: item.type,
                tmdbId: item.tmdbId,
                mediaType: item.mediaType,
              }),
            }))
          );
        }
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        }
      } catch {
        // ignore remote errors
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };
    loadRemote();
    return () => {
      isMounted = false;
    };
  }, [accessToken, isAuthed]);

  const persist = useCallback((updater: (list: SavedRelease[]) => SavedRelease[]) => {
    setSaved((prev) => {
      const next = updater(prev);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore write errors
        }
      }
      return next;
    });
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
