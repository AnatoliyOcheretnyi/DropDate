import { QueryClient } from "@tanstack/react-query";

import {
  clearPersistedQueryCache,
  hydrateQueryCache,
  persistQueryCache,
} from "./persist";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Synchronous, so the first render already sees last session's catalogue.
hydrateQueryCache(queryClient);
persistQueryCache(queryClient);

export const clearUserSessionCache = async () => {
  await queryClient.cancelQueries();
  queryClient.clear();
  clearPersistedQueryCache();
};
