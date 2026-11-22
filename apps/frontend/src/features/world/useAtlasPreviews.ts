"use client";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { WorldItem } from "./types";
export type AtlasCatalog = {
  complete?: boolean;
  countries: Record<string, { posters: WorldItem[]; refreshedAt?: string }>;
};
export function useAtlasPreviews(country: string, active: boolean) {
  const query = useQuery<AtlasCatalog>({
    // Invalidate the earlier 12-poster snapshot when upgrading the mosaic.
    queryKey: ["world-atlas-catalog", 24],
    enabled: active,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
    refetchInterval: (query) =>
      active && query.state.data?.complete === false ? 30_000 : false,
    queryFn: async ({ signal }): Promise<AtlasCatalog> => {
      const response = await fetch("/api/world/atlas", { signal });
      if (!response.ok) throw new Error("Не вдалося завантажити кіноатлас");
      return response.json();
    },
  });
  const posters = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(query.data?.countries ?? {}).map(([code, entry]) => [
          code,
          entry.posters,
        ]),
      ),
    [query.data],
  );
  return {
    posters,
    preview: {
      ...query,
      data: query.data ? (posters[country] ?? []).slice(0, 3) : undefined,
    },
  };
}
