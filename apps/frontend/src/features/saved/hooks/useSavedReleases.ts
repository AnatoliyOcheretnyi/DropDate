"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ReleaseInfo, Suggestion } from "../../../shared/lib/release";
import { copy } from "../../../shared/lib/strings";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { publishUnlocks } from "../../../shared/lib/achievementBus";
import { useAuth } from "../../../shared/state/auth";
import {
  bulkRefreshSaved,
  fetchSavedRemote,
  patchSavedStatsRemote,
  removeSavedRemote,
  createSavedRemote,
  type BulkRefreshResult,
} from "../api/savedApi";
import { useSavedStoreSnapshot } from "../store/savedStore";
import {
  getSavedListTypes,
  normalizeListTypes,
  normalizeSavedRelease,
} from "../utils/savedState";
import {
  getSuggestionId,
  savedIdentifier,
  type ListType,
  type SavedRelease,
} from "../../../shared/types/releases";

function useSavedSyncEvents() {
  const { clear } = useSavedStoreSnapshot();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const onClear = () => clear();
    window.addEventListener("saved:clear", onClear);
    return () => {
      window.removeEventListener("saved:clear", onClear);
    };
  }, [clear]);
}

export function useSavedReleases() {
  useSavedSyncEvents();

  const queryClient = useQueryClient();
  const { user, accessToken } = useAuth();
  const { saved, isReady, isRefreshing, setSaved, updateSaved, setRefreshing } =
    useSavedStoreSnapshot();

  const isAuthed = Boolean(user && accessToken);

  const savedRemoteQuery = useQuery({
    queryKey: webQueryKeys.saved(user?.id ?? "guest"),
    enabled: isAuthed,
    queryFn: async ({ signal }) => {
      const remote = await fetchSavedRemote(accessToken!, signal);
      return remote.map((item) => normalizeSavedRelease(item));
    },
    staleTime: 1000 * 60,
  });

  // Remote is the single source of truth. Whenever the server list changes we
  // replace the in-memory store outright so deletions/updates propagate. The
  // ref guards against re-applying the same remote payload (e.g. after
  // `refreshAll` has already merged the fresh list with refreshed dates).
  const lastRemoteRef = useRef<SavedRelease[] | null>(null);

  // Guards against a slow/in-flight GET (e.g. the very first `saved` fetch
  // after login) resolving *after* the user has already made a local change
  // and clobbering it with the pre-change snapshot. A GET is only applied if
  // it resolved at or after our last optimistic write.
  const lastLocalMutationAtRef = useRef(0);

  useEffect(() => {
    if (!isAuthed) {
      lastRemoteRef.current = null;
      setSaved([]);
      return;
    }
    const remoteItems = savedRemoteQuery.data;
    if (remoteItems && remoteItems !== lastRemoteRef.current) {
      lastRemoteRef.current = remoteItems;
      if (savedRemoteQuery.dataUpdatedAt >= lastLocalMutationAtRef.current) {
        setSaved(remoteItems);
      }
    }
  }, [
    isAuthed,
    savedRemoteQuery.data,
    savedRemoteQuery.dataUpdatedAt,
    setSaved,
  ]);

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
      const unlocked = await createSavedRemote(accessToken, payload);
      publishUnlocks(unlocked);
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
      lastLocalMutationAtRef.current = Date.now();
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
    setRefreshing(true);
    try {
      // Pull the latest server state first so deletions/edits made elsewhere
      // drop out of the list, then refresh release dates on the fresh set.
      let base = saved;
      if (isAuthed) {
        const refreshed = await savedRemoteQuery.refetch();
        if (refreshed.data) {
          base = refreshed.data;
          lastRemoteRef.current = refreshed.data;
        }
      }

      if (base.length === 0) {
        setSaved(base);
        return { results: [] as BulkRefreshResult[] };
      }

      const results = await bulkRefreshSaved(base);
      const updates = new Map<string, ReleaseInfo>();
      results.forEach((entry) => {
        if (entry.clientId && entry.info) {
          updates.set(entry.clientId, entry.info);
        }
      });

      const next =
        updates.size > 0
          ? base.map((item) => {
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
          : base;
      setSaved(next);

      return { results };
    } catch (error) {
      throw error instanceof Error ? error : new Error(copy.errors.refreshFailed);
    } finally {
      setRefreshing(false);
    }
  }, [isAuthed, saved, savedRemoteQuery, setRefreshing, setSaved]);
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
