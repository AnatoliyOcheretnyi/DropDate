import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Details,
  ReleaseInfo,
  Suggestion,
} from "../../../shared/types/release";
import type { ListType } from "../../../shared/types/lists";
import { queryKeys } from "../../../shared/api/queryKeys";
import { storageGetJSON, storageSetJSON } from "../../../shared/utils/storage";
import { useAuthStore } from "../../auth/store/authStore";
import { publishAchievementUnlocks } from "../../achievements/model/unlockBus";
import {
  deleteSaved,
  fetchSaved,
  patchSavedStats,
  saveTitle,
} from "../api/saved";
import { useSavedStore, type SavedItem } from "../store/savedStore";
const idOf = (id: number, type: Suggestion["mediaType"]) => `${type}:${id}`;
const listsOf = (x?: ListType[]) =>
  x?.length ? Array.from(new Set(x)) : (["follow"] as ListType[]);
export function useSaved() {
  const user = useAuthStore((s) => s.user);
  const authed = useAuthStore((s) => Boolean(s.user && s.accessToken));
  // Subscribe to the guest slices we actually read; subscribing to the whole
  // store re-rendered every consumer on any unrelated store write.
  const guestSaved = useSavedStore((s) => s.saved);
  const guestIsLoading = useSavedStore((s) => s.isLoading);
  const client = useQueryClient();
  useEffect(() => {
    if (!authed) void useSavedStore.getState().refreshFromAuth();
  }, [authed]);
  const query = useQuery({
    queryKey: queryKeys.saved,
    queryFn: ({ signal }) => fetchSaved(signal),
    enabled: authed,
    staleTime: 30_000,
    initialData: user
      ? (storageGetJSON<SavedItem[]>("dropdate_saved_cache_" + user.id) ??
        undefined)
      : undefined,
  });
  const saved = useMemo(
    () => (authed ? (query.data ?? []) : guestSaved),
    [authed, guestSaved, query.data],
  );
  useEffect(() => {
    if (user && query.data)
      storageSetJSON("dropdate_saved_cache_" + user.id, query.data);
  }, [query.data, user]);

  // O(1) lookups + a stable identity for the read selectors below. Without
  // this every consumer got fresh `isSuggestionSaved`/`getListTypes` closures
  // on each render, which broke `memo()` on every poster card downstream.
  const index = useMemo(() => {
    const map = new Map<string, SavedItem>();
    for (const item of saved) map.set(item.id, item);
    return map;
  }, [saved]);

  // Mutations need the freshest list without re-creating their identity.
  const savedRef = useRef(saved);
  savedRef.current = saved;

  const setServer = (next: SavedItem[]) =>
    client.setQueryData(queryKeys.saved, next);
  const addRelease = async (
    release: ReleaseInfo,
    meta: {
      tmdbId: number;
      mediaType: Suggestion["mediaType"];
      details?: Details;
    },
    types: ListType[] = ["follow"],
  ) => {
    if (!authed)
      return useSavedStore.getState().addRelease(release, meta, types);
    const before = savedRef.current;
    const id = idOf(meta.tmdbId, meta.mediaType);
    const current = savedRef.current.find((x) => x.id === id);
    const nextTypes = Array.from(
      new Set([...(current?.listTypes ?? []), ...listsOf(types)]),
    );
    const optimistic: SavedItem = current
      ? { ...current, listTypes: nextTypes }
      : {
          ...release,
          id,
          tmdbId: meta.tmdbId,
          mediaType: meta.mediaType,
          savedAt: Date.now(),
          details: meta.details,
          listTypes: nextTypes,
        };
    setServer(
      current
        ? savedRef.current.map((x) => (x.id === id ? optimistic : x))
        : [...savedRef.current, optimistic],
    );
    try {
      for (const type of types) {
        const result = await saveTitle(
          release,
          {
            id: meta.tmdbId,
            title: release.title,
            mediaType: meta.mediaType,
            posterUrl: release.posterUrl,
          },
          type,
        );
        publishAchievementUnlocks(result.unlockedAchievements ?? []);
      }
      await client.invalidateQueries({ queryKey: queryKeys.saved });
      await client.invalidateQueries({ queryKey: queryKeys.achievements });
    } catch (e) {
      setServer(before);
      throw e;
    }
  };
  const removeRelease = async (id: string, type?: ListType) => {
    const existing = savedRef.current.find((x) => x.id === id);
    if (!existing) return;
    if (!authed) return useSavedStore.getState().removeRelease(id, type);
    const before = savedRef.current;
    setServer(
      type
        ? savedRef.current
            .map((x) =>
              x.id === id
                ? { ...x, listTypes: x.listTypes.filter((t) => t !== type) }
                : x,
            )
            .filter((x) => x.listTypes.length)
        : savedRef.current.filter((x) => x.id !== id),
    );
    try {
      await deleteSaved(existing.tmdbId, existing.mediaType, type);
      await client.invalidateQueries({ queryKey: queryKeys.saved });
    } catch (e) {
      setServer(before);
      throw e;
    }
  };
  const updateStats = async (
    item: Suggestion,
    type: ListType,
    stats: { userRating?: number; watchCount?: number; lastWatchedAt?: string },
  ) => {
    if (!authed) return useSavedStore.getState().updateStats(item, type, stats);
    const before = savedRef.current;
    setServer(
      savedRef.current.map((x) =>
        x.id === idOf(item.id, item.mediaType) ? { ...x, ...stats } : x,
      ),
    );
    try {
      await patchSavedStats(item, type, stats);
      await client.invalidateQueries({ queryKey: queryKeys.saved });
    } catch (e) {
      setServer(before);
      throw e;
    }
  };
  const setListTypes = async (
    item: Suggestion,
    types: ListType[],
    meta?: { release?: ReleaseInfo; details?: Details },
  ) => {
    const existing = savedRef.current.find(
      (x) => x.id === idOf(item.id, item.mediaType),
    );
    const current = existing?.listTypes ?? [];
    const add = types.filter((x) => !current.includes(x));
    const remove = current.filter((x) => !types.includes(x));
    if (meta?.release && add.length)
      await addRelease(
        meta.release,
        { tmdbId: item.id, mediaType: item.mediaType, details: meta.details },
        add,
      );
    for (const type of remove)
      await removeRelease(idOf(item.id, item.mediaType), type);
  };
  const findByTmdbId = useCallback(
    (id: number, type: Suggestion["mediaType"]) => index.get(idOf(id, type)),
    [index],
  );
  const getListTypes = useCallback(
    (item: Suggestion) =>
      index.get(idOf(item.id, item.mediaType))?.listTypes ?? [],
    [index],
  );
  const isSuggestionSaved = useCallback(
    (item: Suggestion) => index.has(idOf(item.id, item.mediaType)),
    [index],
  );
  return {
    saved,
    isLoading: authed ? query.isLoading : guestIsLoading,
    addRelease,
    removeRelease,
    updateStats,
    setListTypes,
    findByTmdbId,
    getListTypes,
    isSuggestionSaved,
  };
}
