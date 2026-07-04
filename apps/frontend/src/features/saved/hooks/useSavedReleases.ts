"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ReleaseInfo, Suggestion } from "../../../shared/lib/release";
import { copy } from "../../../shared/lib/strings";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { useAuth } from "../../../shared/state/auth";
import {
  bulkRefreshSaved,
  createSavedRemote,
  fetchSavedRemote,
  patchSavedStatsRemote,
  removeSavedRemote,
  type BulkRefreshResult,
} from "../api/savedApi";
import { useSavedStoreSnapshot } from "../store/savedStore";
import {
  clearSyncOnAuth,
  getSavedListTypes,
  mergeSaved,
  normalizeListTypes,
  normalizeSavedRelease,
  readSavedFromStorage,
  shouldSyncOnAuth,
} from "../utils/savedState";
import {
  getSuggestionId,
  savedIdentifier,
  type ListType,
  type SavedRelease,
} from "../../../shared/types/releases";

function useSavedSyncEvents() {
  const { clear, hydrate } = useSavedStoreSnapshot();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const onClear = () => clear();
    const onStorage = (event: StorageEvent) => {
      if (event.key) {
        hydrate();
      }
    };
    window.addEventListener("saved:clear", onClear);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("saved:clear", onClear);
      window.removeEventListener("storage", onStorage);
    };
  }, [clear, hydrate]);
}

export function useSavedReleases() {
  useSavedSyncEvents();

  const queryClient = useQueryClient();
  const { user, accessToken } = useAuth();
  const { saved, isReady, isRefreshing, setSaved, updateSaved, setRefreshing } =
    useSavedStoreSnapshot();

  const isAuthed = Boolean(user && accessToken);
  const localSnapshot = useMemo(() => readSavedFromStorage(), []);

  useEffect(() => {
    if (!isReady && localSnapshot.length > 0) {
      setSaved(localSnapshot);
    }
  }, [isReady, localSnapshot, setSaved]);

  const savedRemoteQuery = useQuery({
    queryKey: webQueryKeys.saved(user?.id ?? "guest"),
    enabled: isAuthed,
    queryFn: async ({ signal }) => {
      const remote = await fetchSavedRemote(accessToken!, signal);
      return remote.map((item) => normalizeSavedRelease(item));
    },
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (!isAuthed || !savedRemoteQuery.data || !accessToken) {
      return;
    }

    let cancelled = false;

    const syncRemote = async () => {
      const remoteItems = savedRemoteQuery.data ?? [];
      const localItems = readSavedFromStorage();

      if (shouldSyncOnAuth()) {
        const localToSync = localItems.filter((item) => item.tmdbId && item.mediaType);
        if (localToSync.length > 0) {
          await Promise.all(
            localToSync.flatMap((item) =>
              normalizeListTypes(item.listTypes).flatMap((listType) => {
                const remoteOps = [
                  createSavedRemote(accessToken, {
                    tmdbId: item.tmdbId!,
                    mediaType: item.mediaType!,
                    title: item.title,
                    nextRelease: item.nextRelease,
                    status: item.status,
                    posterUrl: item.posterUrl,
                    backdropUrl: item.backdropUrl,
                    listType,
                  }),
                ];

                const hasStats =
                  typeof item.userRating === "number" ||
                  typeof item.watchCount === "number" ||
                  Boolean(item.lastWatchedAt);

                if (hasStats) {
                  remoteOps.push(
                    patchSavedStatsRemote(accessToken, {
                      tmdbId: item.tmdbId!,
                      mediaType: item.mediaType!,
                      listType,
                      userRating: item.userRating,
                      watchCount: item.watchCount,
                      lastWatchedAt: item.lastWatchedAt,
                    })
                  );
                }
                return remoteOps;
              })
            )
          );
          clearSyncOnAuth();
          if (!cancelled) {
            void queryClient.invalidateQueries({
              queryKey: webQueryKeys.saved(user?.id ?? "guest"),
            });
          }
          return;
        }
        clearSyncOnAuth();
      }

      if (!cancelled) {
        setSaved(mergeSaved(localItems, remoteItems));
      }
    };

    void syncRemote();

    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthed, queryClient, savedRemoteQuery.data, setSaved, user?.id]);

  const savedById = useMemo(() => {
    const index = new Map<string, SavedRelease>();
    saved.forEach((item) => {
      index.set(item.id, item);
    });
    return index;
  }, [saved]);

  const invalidateSavedSideEffects = useCallback(() => {
    if (user?.id) {
      void queryClient.invalidateQueries({
        queryKey: webQueryKeys.notifications(user.id),
      });
      void queryClient.invalidateQueries({
        queryKey: webQueryKeys.recommendations(user.id),
      });
    }
  }, [queryClient, user?.id]);

  const addRemoteMutation = useMutation({
    mutationFn: async (payload: {
      tmdbId: number;
      mediaType: Suggestion["mediaType"];
      title: string;
      nextRelease: string;
      status: ReleaseInfo["status"];
      posterUrl?: string;
      backdropUrl?: string;
      listType: ListType;
    }) => {
      if (!accessToken) {
        return;
      }
      await createSavedRemote(accessToken, payload);
    },
    onSettled: () => {
      invalidateSavedSideEffects();
    },
  });

  const removeRemoteMutation = useMutation({
    mutationFn: async (payload: {
      tmdbId: number;
      mediaType: Suggestion["mediaType"];
      listType?: ListType;
    }) => {
      if (!accessToken) {
        return;
      }
      await removeSavedRemote(accessToken, payload);
    },
    onSettled: () => {
      invalidateSavedSideEffects();
    },
  });

  const statsRemoteMutation = useMutation({
    mutationFn: async (payload: {
      tmdbId: number;
      mediaType: Suggestion["mediaType"];
      listType: ListType;
      userRating?: number;
      watchCount?: number;
      lastWatchedAt?: string;
    }) => {
      if (!accessToken) {
        return;
      }
      await patchSavedStatsRemote(accessToken, payload);
    },
  });

  const persist = useCallback(
    (updater: (items: SavedRelease[]) => SavedRelease[]) => {
      updateSaved(updater);
    },
    [updateSaved]
  );

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
        nextListTypes.forEach((listType) => {
          addRemoteMutation.mutate({
            tmdbId: meta.tmdbId!,
            mediaType: meta.mediaType!,
            title: release.title,
            nextRelease: release.nextRelease,
            status: release.status,
            posterUrl: release.posterUrl,
            backdropUrl: release.backdropUrl,
            listType,
          });
        });
      }
    },
    [addRemoteMutation, isAuthed, persist]
  );

  const removeRelease = useCallback(
    (id: string) => {
      const target = saved.find((item) => item.id === id);
      persist((prev) => prev.filter((item) => item.id !== id));

      if (isAuthed && target?.tmdbId && target.mediaType) {
        const listTypes = target.listTypes ?? [];
        if (listTypes.length > 0) {
          listTypes.forEach((listType) => {
            removeRemoteMutation.mutate({
              tmdbId: target.tmdbId!,
              mediaType: target.mediaType!,
              listType,
            });
          });
          return;
        }
        removeRemoteMutation.mutate({
          tmdbId: target.tmdbId,
          mediaType: target.mediaType,
        });
      }
    },
    [isAuthed, persist, removeRemoteMutation, saved]
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
      return savedById.has(id);
    },
    [savedById]
  );

  const isSuggestionSaved = useCallback(
    (suggestion: Suggestion) => {
      const match = savedById.get(getSuggestionId(suggestion));
      return Boolean(match && normalizeListTypes(match.listTypes).length > 0);
    },
    [savedById]
  );

  const getListTypes = useCallback(
    (suggestion: Suggestion) => getSavedListTypes(savedById, suggestion),
    [savedById]
  );

  const getSavedItem = useCallback(
    (suggestion: Suggestion) => savedById.get(getSuggestionId(suggestion)),
    [savedById]
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

      if (isAuthed && suggestion.id && suggestion.mediaType) {
        statsRemoteMutation.mutate({
          tmdbId: suggestion.id,
          mediaType: suggestion.mediaType,
          listType,
          userRating: stats.userRating,
          watchCount: stats.watchCount,
          lastWatchedAt: stats.lastWatchedAt,
        });
      }
    },
    [isAuthed, persist, statsRemoteMutation]
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
            item.id === id ? { ...item, listTypes: normalized } : item
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

      if (!isAuthed || !suggestion.id || !suggestion.mediaType) {
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
          addRemoteMutation.mutate({
            tmdbId: suggestion.id,
            mediaType: suggestion.mediaType,
            title: payloadRelease.title,
            nextRelease: payloadRelease.nextRelease,
            status: payloadRelease.status,
            posterUrl: payloadRelease.posterUrl,
            backdropUrl: payloadRelease.backdropUrl,
            listType,
          });
        });
      }

      toRemove.forEach((listType) => {
        removeRemoteMutation.mutate({
          tmdbId: suggestion.id,
          mediaType: suggestion.mediaType,
          listType,
        });
      });
    },
    [addRemoteMutation, isAuthed, persist, removeRemoteMutation, saved]
  );

  const toggleListType = useCallback(
    (
      suggestion: Suggestion,
      listType: ListType,
      release?: ReleaseInfo | null
    ) => {
      const current = getSavedListTypes(savedById, suggestion);
      const next = current.includes(listType)
        ? current.filter((entry) => entry !== listType)
        : [...current, listType];
      setSuggestionLists(suggestion, next, release);
    },
    [savedById, setSuggestionLists]
  );

  const refreshAll = useCallback(async () => {
    if (saved.length === 0) {
      return { results: [] as BulkRefreshResult[] };
    }

    setRefreshing(true);
    try {
      const results = await bulkRefreshSaved(saved);
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
                  userRating: item.userRating,
                  watchCount: item.watchCount,
                  lastWatchedAt: item.lastWatchedAt,
                }
              : item;
          })
        );
      }

      return { results };
    } catch (error) {
      throw error instanceof Error ? error : new Error(copy.errors.refreshFailed);
    } finally {
      setRefreshing(false);
    }
  }, [persist, saved, setRefreshing]);
  return {
    saved,
    savedCount: saved.length,
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
