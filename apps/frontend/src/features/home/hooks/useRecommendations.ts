"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import type { Suggestion } from "../../../shared/lib/release";
import { fetchWithAuth, useAuth } from "../../../shared/state/auth";

/**
 * One recommendation as the backend sends it, explanation included. The
 * discovery row renders `reason.text` verbatim -- an unexplained pick reads as
 * an advert, so the reason travels with the item rather than being invented in
 * the UI.
 */
export type RecommendationItem = {
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
  const [excluded, setExcluded] = useState<string[]>([]);
  const [novelty, setNovelty] = useState(20);
  useEffect(() => {
    setExcluded([]);
    setOptimisticFeedback({});
  }, [user?.id]);
  const queryKey = [
    ...webQueryKeys.recommendations(user?.id ?? "guest"),
    novelty,
    excluded.join(","),
  ];

  const recommendationsQuery = useQuery({
    queryKey,
    enabled,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        limit: "4",
        ai: "1",
        novelty: String(novelty),
        exclude: excluded.join(","),
      });
      const response = await fetchWithAuth(
        `/api/recommendations/me?${params}`,
        { signal },
      );

      if (!response.ok) {
        throw new Error("Не вдалося завантажити рекомендації");
      }

      const payload: { items?: RecommendationItem[] } = await response.json();
      return Array.isArray(payload.items) ? payload.items : [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const feedbackQueryKey = webQueryKeys.recommendationFeedback(
    user?.id ?? "guest",
  );
  const feedbackQuery = useQuery({
    queryKey: feedbackQueryKey,
    enabled,
    queryFn: async ({ signal }) => {
      const response = await fetchWithAuth("/api/recommendations/feedback", {
        signal,
      });
      if (!response.ok) throw new Error("Не вдалося завантажити відгуки");
      const payload: { items?: FeedbackItem[] } = await response.json();
      return payload.items ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const feedback = useMemo(() => {
    const merged = Object.fromEntries(
      (feedbackQuery.data ?? []).map((item) => [
        `${item.mediaType}:${item.tmdbId}`,
        item.action,
      ]),
    ) as Record<string, RecommendationFeedback>;
    for (const [key, action] of Object.entries(optimisticFeedback)) {
      if (action === null) delete merged[key];
      else merged[key] = action;
    }
    return merged;
  }, [feedbackQuery.data, optimisticFeedback]);

  const items = enabled
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

      const response = await fetchWithAuth("/api/recommendations/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tmdbId: item.id,
          mediaType: item.mediaType,
          title: item.title,
          action,
        }),
      }).catch(() => null);

      if (!response?.ok) {
        setOptimisticFeedback((current) => {
          const next = { ...current };
          if (previous) next[key] = previous;
          else delete next[key];
          return next;
        });
        return false;
      }

      await queryClient.invalidateQueries({ queryKey: feedbackQueryKey });
      void queryClient.invalidateQueries({
        queryKey: webQueryKeys.recommendations(user?.id ?? "guest"),
      });
      setOptimisticFeedback((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      return true;
    },
    [feedback, feedbackQueryKey, queryClient, user?.id],
  );

  // Same gating as `items`, but keeping the explanation attached.
  const itemsWithReasons = enabled ? (recommendationsQuery.data ?? []) : [];

  return {
    items,
    itemsWithReasons,
    feedback,
    sendFeedback,
    error: enabled ? recommendationsQuery.error : null,
    novelty,
    setNovelty: (value: number) => {
      setNovelty(value);
      setExcluded([]);
    },
    exclude: (item: Suggestion) =>
      setExcluded((current) =>
        Array.from(new Set([...current, `${item.mediaType}:${item.id}`])),
      ),
    exhausted:
      enabled &&
      excluded.length > 0 &&
      recommendationsQuery.isSuccess &&
      !recommendationsQuery.data?.length,
    restart: () => {
      if (excluded.length) setExcluded([]);
      else void recommendationsQuery.refetch();
    },
    isLoading: enabled && recommendationsQuery.isLoading,
    isRefreshing: recommendationsQuery.isFetching,
    refresh: () => {
      setExcluded((current) =>
        Array.from(
          new Set([
            ...current,
            ...(recommendationsQuery.data ?? []).map(
              (item) => `${item.mediaType}:${item.tmdbId}`,
            ),
          ]),
        ),
      );
    },
  };
}
