"use client";

import { useQuery } from "@tanstack/react-query";
import { requestApi } from "../../../shared/api/http";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import type { Suggestion } from "../../../shared/lib/release";
import { useAuth } from "../../../shared/state/auth";

// Minimum items required before we surface the personalized row, per spec.
const MIN_VISIBLE = 6;

type RecommendationItem = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year?: string;
  posterUrl?: string;
};

const toSuggestion = (item: RecommendationItem): Suggestion => ({
  id: item.tmdbId,
  title: item.title,
  mediaType: item.mediaType,
  year: item.year,
  posterUrl: item.posterUrl,
});

/**
 * useRecommendations loads the personalized "Recommended for you" feed for the
 * authenticated user. It returns an empty list for logged-out or low-signal
 * users so the home page degrades to the generic experience.
 */
export function useRecommendations() {
  const { accessToken, user } = useAuth();
  const enabled = Boolean(accessToken && user?.id);

  const recommendationsQuery = useQuery({
    queryKey: webQueryKeys.recommendations(user?.id ?? "guest"),
    enabled,
    queryFn: async ({ signal }) => {
      const response = await requestApi<{ items?: RecommendationItem[] }>({
        url: "/api/recommendations/me",
        method: "GET",
        params: { limit: 18 },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      });

      if (!response.ok) {
        return [];
      }

      return Array.isArray(response.payload?.items) ? response.payload.items : [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const items =
    enabled && (recommendationsQuery.data?.length ?? 0) >= MIN_VISIBLE
      ? (recommendationsQuery.data ?? []).map(toSuggestion)
      : [];

  return {
    items,
    isLoading: recommendationsQuery.isLoading,
  };
}
