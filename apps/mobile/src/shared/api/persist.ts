import type { QueryClient } from "@tanstack/react-query";

import {
  storageDelete,
  storageGetJSON,
  storageSetJSON,
} from "../utils/storage";

/**
 * Minimal MMKV-backed persistence for React Query.
 *
 * We deliberately avoid `@tanstack/react-query-persist-client`: the only thing
 * we need is "show the last catalogue instantly on a cold start", and MMKV
 * reads are synchronous, so hydration can happen before the first render
 * instead of through an async gate + loading state.
 *
 * Only public, non-personal catalogue queries are cached. Anything behind auth
 * (saved lists, recommendations, notifications) is left out on purpose so a
 * logged-out device never holds another account's data on disk.
 */
const STORAGE_KEY = "dropdate_query_cache_v1";
const MAX_AGE = 1000 * 60 * 60 * 24; // a day-old catalogue is still worth showing

const PERSISTED_PREFIXES = [
  "home",
  "trending",
  "popular",
  "top-rated",
  "upcoming",
  "collection",
];

type PersistedEntry = {
  key: unknown[];
  state: { data: unknown; dataUpdatedAt: number };
};

const shouldPersist = (key: readonly unknown[]) =>
  typeof key[0] === "string" && PERSISTED_PREFIXES.includes(key[0]);

/**
 * Reads the snapshot into the cache. Call once, before the first render, so
 * screens mount with data instead of skeletons.
 */
export function hydrateQueryCache(client: QueryClient) {
  const snapshot = storageGetJSON<PersistedEntry[]>(STORAGE_KEY);
  if (!snapshot) return;
  const now = Date.now();
  for (const entry of snapshot) {
    if (now - entry.state.dataUpdatedAt > MAX_AGE) continue;
    client.setQueryData(entry.key, entry.state.data, {
      updatedAt: entry.state.dataUpdatedAt,
    });
  }
}

/**
 * Subscribes to the cache and writes a debounced snapshot back to MMKV.
 * Returns an unsubscribe function.
 */
export function persistQueryCache(client: QueryClient) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const write = () => {
    timer = null;
    const entries: PersistedEntry[] = [];
    for (const query of client.getQueryCache().getAll()) {
      if (query.state.status !== "success") continue;
      if (!shouldPersist(query.queryKey)) continue;
      entries.push({
        key: query.queryKey as unknown[],
        state: {
          data: query.state.data,
          dataUpdatedAt: query.state.dataUpdatedAt,
        },
      });
    }
    storageSetJSON(STORAGE_KEY, entries);
  };

  return client.getQueryCache().subscribe(() => {
    if (timer) return;
    timer = setTimeout(write, 1500);
  });
}

export const clearPersistedQueryCache = () => storageDelete(STORAGE_KEY);
