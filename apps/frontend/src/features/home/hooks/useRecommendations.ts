"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  reason?: { text?: string };
};

export type RecommendationFeedback = "liked" | "disliked";
export type RecommendationFeedbackAction = RecommendationFeedback | "none";

type FeedbackItem = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  action: RecommendationFeedback;
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
  const queryClient = useQueryClient();
  const [optimisticFeedback, setOptimisticFeedback] = useState<
    Record<string, RecommendationFeedback | null>
  >({});
  const enabled = Boolean(accessToken && user?.id);
  const queryKey = webQueryKeys.recommendations(user?.id ?? "guest");

  const recommendationsQuery = useQuery({
    queryKey,
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

  const feedbackQueryKey = webQueryKeys.recommendationFeedback(
    user?.id ?? "guest"
  );
  const feedbackQuery = useQuery({
    queryKey: feedbackQueryKey,
    enabled,
    queryFn: async ({ signal }) => {
      const response = await requestApi<{ items?: FeedbackItem[] }>({
        url: "/api/recommendations/feedback",
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      if (!response.ok) return [];
      return response.payload?.items ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const feedback = useMemo(() => {
    const merged = Object.fromEntries(
      (feedbackQuery.data ?? []).map((item) => [
        `${item.mediaType}:${item.tmdbId}`,
        item.action,
      ])
    ) as Record<string, RecommendationFeedback>;
    for (const [key, action] of Object.entries(optimisticFeedback)) {
      if (action === null) delete merged[key];
      else merged[key] = action;
    }
    return merged;
  }, [feedbackQuery.data, optimisticFeedback]);

  const items =
    enabled && (recommendationsQuery.data?.length ?? 0) >= MIN_VISIBLE
      ? (recommendationsQuery.data ?? []).map(toSuggestion)
      : [];

  const sendFeedback = useCallback(
    async (item: Suggestion, action: RecommendationFeedbackAction) => {
      const key = `${item.mediaType}:${item.id}`;
      const previous = feedback[key];
      setOptimisticFeedback((current) => ({
        ...current,
        [key]: action === "none" ? null : action,
      }));

      const response = await requestApi<{ action: RecommendationFeedbackAction }>({
        url: "/api/recommendations/feedback",
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        data: {
          tmdbId: item.id,
          mediaType: item.mediaType,
          title: item.title,
          action,
        },
      });

      if (!response.ok) {
        setOptimisticFeedback((current) => {
          const next = { ...current };
          if (previous) next[key] = previous;
          else delete next[key];
          return next;
        });
        return;
      }

      await queryClient.invalidateQueries({ queryKey: feedbackQueryKey });
      setOptimisticFeedback((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    },
    [accessToken, feedback, feedbackQueryKey, queryClient]
  );

  return {
    items,
    feedback,
    sendFeedback,
    isLoading: recommendationsQuery.isLoading,
  };
}
