"use client";

import { useQuery } from "@tanstack/react-query";
import { requestApi } from "../../../shared/api/http";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { useAuth } from "../../../shared/state/auth";

export type DailyPick = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year?: string;
  posterUrl?: string;
  reason: { text?: string };
};

export function useDailyPick() {
  const { accessToken, user } = useAuth();
  const enabled = Boolean(accessToken && user?.id);
  const query = useQuery({
    queryKey: webQueryKeys.dailyPick(user?.id ?? "guest"),
    enabled,
    queryFn: async ({ signal }) => {
      const response = await requestApi<{ date: string; pick?: DailyPick }>({
        url: "/api/recommendations/daily",
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      if (!response.ok || !response.payload) return null;
      return response.payload.pick ?? null;
    },
    staleTime: 1000 * 60 * 30,
  });
  return { pick: enabled ? query.data ?? null : null, isLoading: query.isLoading };
}
