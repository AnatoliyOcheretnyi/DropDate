"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReleaseInfo, Suggestion } from "../../lib/release";
import {
  STORAGE_KEY,
  type SavedRelease,
  getReleaseId,
  getSuggestionId,
} from "../lib/releases";
import { copy } from "../../lib/strings";

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setSaved(readSavedFromStorage());
    setIsReady(true);
  }, []);

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
      const id = getReleaseId(release);
      persist((prev) => {
        if (prev.some((item) => item.id === id)) {
          return prev;
        }
        return [...prev, { ...release, id, ...meta }];
      });
    },
    [persist]
  );

  const removeRelease = useCallback(
    (id: string) => {
      persist((prev) => prev.filter((item) => item.id !== id));
    },
    [persist]
  );

  const isReleaseSaved = useCallback(
    (release: ReleaseInfo | null) => {
      if (!release) {
        return false;
      }
      const id = getReleaseId(release);
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

  return {
    saved,
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
