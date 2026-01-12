"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReleaseInfo, Suggestion } from "../../lib/release";
import {
  STORAGE_KEY,
  type SavedRelease,
  type ListType,
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

const STATUS_LISTS: ListType[] = ["favorite", "watched", "disliked"];

const normalizeListTypes = (listTypes?: ListType[]) => {
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

const readSavedFromStorage = (): SavedRelease[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedRelease[];
      return parsed.map((item) => ({
        ...item,
        listTypes: normalizeListTypes(item.listTypes),
      }));
    }
  } catch {
    // ignore malformed storage
  }
  return [];
};

const mergeSaved = (localItems: SavedRelease[], remoteItems: SavedRelease[]) => {
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
    const mergedRating =
      typeof existing.userRating === "number"
        ? existing.userRating
        : item.userRating;
    const mergedWatchCount =
      (existing.watchCount || 0) > 0 ? existing.watchCount : item.watchCount;
    const mergedLastWatchedAt =
      existing.lastWatchedAt || item.lastWatchedAt;
    map.set(item.id, {
      ...existing,
      listTypes: combined,
      userRating: mergedRating,
      watchCount: mergedWatchCount,
      lastWatchedAt: mergedLastWatchedAt,
    });
  });
  return Array.from(map.values());
};

export function useSavedReleases() {
  const [saved, setSaved] = useState<SavedRelease[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user, accessToken } = useAuth();
  const pendingRemoteRef = useRef<
    Map<
      string,
      {
        action: "add" | "remove";
        tmdbId: number;
        mediaType: Suggestion["mediaType"];
        listType: ListType;
        release?: ReleaseInfo | null;
      }
    >
  >(new Map());
  const flushTimeoutRef = useRef<number | null>(null);
  const pendingStatsRef = useRef<
    Map<
      string,
      {
        tmdbId: number;
        mediaType: Suggestion["mediaType"];
        listType: ListType;
        userRating?: number;
        watchCount?: number;
        lastWatchedAt?: string;
      }
    >
  >(new Map());
  const flushStatsTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setSaved(readSavedFromStorage());
    setIsReady(true);
  }, []);

  const isAuthed = Boolean(user && accessToken);

  const queueRemoteAction = useCallback(
    (entry: {
      action: "add" | "remove";
      tmdbId: number;
      mediaType: Suggestion["mediaType"];
      listType: ListType;
      release?: ReleaseInfo | null;
    }) => {
      if (!isAuthed || !accessToken) {
        return;
      }
      const key = `${entry.tmdbId}:${entry.mediaType}:${entry.listType}`;
      pendingRemoteRef.current.set(key, entry);
      if (flushTimeoutRef.current) {
        window.clearTimeout(flushTimeoutRef.current);
      }
      flushTimeoutRef.current = window.setTimeout(() => {
        const batch = Array.from(pendingRemoteRef.current.values());
        pendingRemoteRef.current.clear();
        batch.forEach((item) => {
          if (item.action === "add" && item.release) {
            fetch("/api/saved", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                tmdbId: item.tmdbId,
                mediaType: item.mediaType,
                title: item.release.title,
                nextRelease: item.release.nextRelease,
                status: item.release.status,
                posterUrl: item.release.posterUrl,
                backdropUrl: item.release.backdropUrl,
                listType: item.listType,
              }),
            }).catch(() => null);
            return;
          }
          if (item.action === "remove") {
            const params = new URLSearchParams({
              tmdbId: String(item.tmdbId),
              mediaType: item.mediaType,
              listType: item.listType,
            });
            fetch(`/api/saved/items?${params.toString()}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${accessToken}` },
            }).catch(() => null);
          }
        });
      }, 420);
    },
    [accessToken, isAuthed]
  );

  const queueStatsUpdate = useCallback(
    (entry: {
      tmdbId: number;
      mediaType: Suggestion["mediaType"];
      listType: ListType;
      userRating?: number;
      watchCount?: number;
      lastWatchedAt?: string;
    }) => {
      if (!isAuthed || !accessToken) {
        return;
      }
      const key = `${entry.tmdbId}:${entry.mediaType}:${entry.listType}:stats`;
      pendingStatsRef.current.set(key, entry);
      if (flushStatsTimeoutRef.current) {
        window.clearTimeout(flushStatsTimeoutRef.current);
      }
      flushStatsTimeoutRef.current = window.setTimeout(() => {
        const batch = Array.from(pendingStatsRef.current.values());
        pendingStatsRef.current.clear();
        batch.forEach((item) => {
          fetch("/api/saved/items", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              tmdbId: item.tmdbId,
              mediaType: item.mediaType,
              listType: item.listType,
              userRating: item.userRating,
              watchCount: item.watchCount,
              lastWatchedAt: item.lastWatchedAt,
            }),
          }).catch(() => null);
        });
      }, 520);
    },
    [accessToken, isAuthed]
  );

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
          return null;
        }
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const normalizedRemote = items.map((item: SavedRelease & { listType?: string }) => {
          const listTypes = normalizeListTypes(
            item.listTypes ?? (item.listType ? [item.listType as ListType] : undefined)
          );
          return {
            ...item,
            listTypes,
            id: savedIdentifier({
              title: item.title,
              type: item.type,
              tmdbId: item.tmdbId,
              mediaType: item.mediaType,
            }),
          };
        });
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
              Promise.all(
                normalizeListTypes(item.listTypes).map((listType) => {
                  const hasStats =
                    typeof item.userRating === "number" ||
                    typeof item.watchCount === "number" ||
                    Boolean(item.lastWatchedAt);
                  return Promise.all([
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
                        listType,
                      }),
                    }).catch(() => null),
                    hasStats
                      ? fetch("/api/saved/items", {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${accessToken}`,
                          },
                          body: JSON.stringify({
                            tmdbId: item.tmdbId,
                            mediaType: item.mediaType,
                            listType,
                            userRating: item.userRating,
                            watchCount: item.watchCount,
                            lastWatchedAt: item.lastWatchedAt,
                          }),
                        }).catch(() => null)
                      : Promise.resolve(null),
                  ]);
                })
              )
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
    (
      release: ReleaseInfo,
      meta?: { tmdbId?: number; mediaType?: Suggestion["mediaType"] },
      listTypes: ListType[] = ["follow"]
    ) => {
      const id = savedIdentifier({
        title: release.title,
        type: release.type,
        tmdbId: meta?.tmdbId,
        mediaType: meta?.mediaType,
      });
      const nextListTypes = normalizeListTypes(listTypes);
      persist((prev) => {
        const existing = prev.find((item) => item.id === id);
        if (existing) {
          const combined = Array.from(
            new Set([...normalizeListTypes(existing.listTypes), ...nextListTypes])
          );
          return prev.map((item) =>
            item.id === id ? { ...item, ...meta, listTypes: combined } : item
          );
        }
        return [...prev, { ...release, id, ...meta, listTypes: nextListTypes }];
      });
      if (isAuthed && meta?.tmdbId && meta?.mediaType) {
        normalizeListTypes(listTypes).forEach((listType) => {
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
              listType,
            }),
          }).catch(() => null);
        });
      }
    },
    [accessToken, isAuthed, persist]
  );

  const removeRelease = useCallback(
    (id: string) => {
      const target = saved.find((item) => item.id === id);
      persist((prev) => prev.filter((item) => item.id !== id));
      if (isAuthed && target?.tmdbId && target.mediaType) {
        const listTypes = target.listTypes ?? [];
        if (listTypes.length > 0) {
          listTypes.forEach((listType) => {
            const params = new URLSearchParams({
              tmdbId: String(target.tmdbId),
              mediaType: target.mediaType,
              listType,
            });
            fetch(`/api/saved/items?${params.toString()}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${accessToken}` },
            }).catch(() => null);
          });
          return;
        }
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
      const match = saved.find((item) => item.id === id);
      return Boolean(match && normalizeListTypes(match.listTypes).length > 0);
    },
    [saved]
  );

  const getListTypes = useCallback(
    (suggestion: Suggestion) => {
      const id = getSuggestionId(suggestion);
      const match = saved.find((item) => item.id === id);
      return match ? normalizeListTypes(match.listTypes) : [];
    },
    [saved]
  );

  const getSavedItem = useCallback(
    (suggestion: Suggestion) => {
      const id = getSuggestionId(suggestion);
      return saved.find((item) => item.id === id);
    },
    [saved]
  );

  const updateListStats = useCallback(
    (
      suggestion: Suggestion,
      listType: ListType,
      stats: {
        userRating?: number;
        watchCount?: number;
        lastWatchedAt?: string;
      }
    ) => {
      const id = getSuggestionId(suggestion);
      persist((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                userRating:
                  typeof stats.userRating === "number"
                    ? stats.userRating
                    : item.userRating,
                watchCount:
                  typeof stats.watchCount === "number"
                    ? stats.watchCount
                    : item.watchCount,
                lastWatchedAt: stats.lastWatchedAt || item.lastWatchedAt,
              }
            : item
        )
      );
      if (!suggestion.id || !suggestion.mediaType) {
        return;
      }
      queueStatsUpdate({
        tmdbId: suggestion.id,
        mediaType: suggestion.mediaType,
        listType,
        userRating: stats.userRating,
        watchCount: stats.watchCount,
        lastWatchedAt: stats.lastWatchedAt,
      });
    },
    [persist, queueStatsUpdate]
  );

  const setSuggestionLists = useCallback(
    (
      suggestion: Suggestion,
      listTypes: ListType[],
      release?: ReleaseInfo | null
    ) => {
      const id = getSuggestionId(suggestion);
      const normalized = normalizeListTypes(listTypes);
      const existing = saved.find((item) => item.id === id);
      const previous = existing ? normalizeListTypes(existing.listTypes) : [];
      persist((prev) => {
        const current = prev.find((item) => item.id === id);
        if (normalized.length === 0) {
          return prev.filter((item) => item.id !== id);
        }
        if (current) {
          return prev.map((item) =>
            item.id === id
              ? { ...item, listTypes: normalized }
              : item
          );
        }
        if (!release) {
          return prev;
        }
        return [
          ...prev,
          {
            ...release,
            id,
            tmdbId: suggestion.id,
            mediaType: suggestion.mediaType,
            listTypes: normalized,
          },
        ];
      });

      if (!isAuthed || !accessToken) {
        return;
      }
      if (!suggestion.id || !suggestion.mediaType) {
        return;
      }
      const payloadRelease =
        release ||
        (existing
          ? {
              title: existing.title,
              type: existing.type,
              nextRelease: existing.nextRelease,
              source: existing.source,
              posterUrl: existing.posterUrl,
              backdropUrl: existing.backdropUrl,
              status: existing.status,
            }
          : null);
      const toAdd = normalized.filter((entry) => !previous.includes(entry));
      const toRemove = previous.filter((entry) => !normalized.includes(entry));

      if (payloadRelease) {
        toAdd.forEach((listType) => {
          queueRemoteAction({
            action: "add",
            tmdbId: suggestion.id,
            mediaType: suggestion.mediaType,
            listType,
            release: payloadRelease,
          });
        });
      }

      if (toRemove.length > 0) {
        toRemove.forEach((listType) => {
          queueRemoteAction({
            action: "remove",
            tmdbId: suggestion.id,
            mediaType: suggestion.mediaType,
            listType,
          });
        });
      }
    },
    [accessToken, isAuthed, persist, queueRemoteAction, saved]
  );

  const toggleListType = useCallback(
    (
      suggestion: Suggestion,
      listType: ListType,
      release?: ReleaseInfo | null
    ) => {
      const id = getSuggestionId(suggestion);
      persist((prev) => {
        const existing = prev.find((item) => item.id === id);
        if (!existing) {
          if (!release) {
            return prev;
          }
          return [
            ...prev,
            {
              ...release,
              id,
              tmdbId: suggestion.id,
              mediaType: suggestion.mediaType,
              listTypes: [listType],
            },
          ];
        }
        const current = normalizeListTypes(existing.listTypes);
        const next = current.includes(listType)
          ? current.filter((entry) => entry !== listType)
          : [...current, listType];
        if (next.length === 0) {
          return prev.filter((item) => item.id !== id);
        }
        return prev.map((item) =>
          item.id === id ? { ...item, listTypes: next } : item
        );
      });
    },
    [persist]
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
            return nextInfo
              ? {
                  ...nextInfo,
                  id: item.id,
                  tmdbId: item.tmdbId,
                  mediaType: item.mediaType,
                  listTypes: item.listTypes,
                }
              : item;
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
    getListTypes,
    getSavedItem,
    setSuggestionLists,
    toggleListType,
    updateListStats,
    refreshAll,
    isRefreshing,
  };
}

type BulkRefreshResult = {
  clientId: string;
  info?: ReleaseInfo;
  error?: string;
};
