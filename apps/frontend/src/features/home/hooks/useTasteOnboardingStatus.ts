"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { useAuth } from "../../../shared/state/auth";

export type TasteOnboardingTitle = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterUrl?: string;
  year?: string;
  sentiment?: "liked" | "disliked" | "watchlist";
};

export type TasteOnboardingStage = "genre" | "country" | "titles" | "completed";

export type TasteOnboardingStatus = {
  stage: TasteOnboardingStage;
  completed: boolean;
  genreComparisons: number;
  countryComparisons: number;
  titleFeedbackCount: number;
  targetComparisons: number;
  targetTitleFeedback: number;
  snoozedUntil?: string;
  genresCompletedAt?: string;
  countriesCompletedAt?: string;
  titlesCompletedAt?: string;
  titles?: TasteOnboardingTitle[];
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { message?: string }).message || "Taste onboarding failed");
  }
  return payload as T;
}

export function useTasteOnboardingStatus() {
  const { user, accessToken } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = webQueryKeys.tasteOnboarding(user?.id ?? "guest");
  const enabled = Boolean(user && accessToken);

  const status = useQuery({
    queryKey,
    enabled,
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/taste/onboarding", {
        headers: { authorization: `Bearer ${accessToken}` },
        signal,
      });
      return parseResponse<TasteOnboardingStatus>(response);
    },
  });

  const mutate = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await fetch("/api/taste/onboarding", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      return parseResponse<TasteOnboardingStatus>(response);
    },
    onSuccess: (next) => {
      queryClient.setQueryData(queryKey, next);
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({
        queryKey: webQueryKeys.recommendations(user?.id ?? "guest"),
      });
      void queryClient.invalidateQueries({
        queryKey: webQueryKeys.saved(user?.id ?? "guest"),
      });
    },
  });

  return {
    status: status.data,
    isLoading: status.isLoading,
    error: status.error?.message,
    refetch: status.refetch,
    snooze: (days = 1) => mutate.mutate({ action: "snooze", days }),
    sendFeedback: (payload: Omit<TasteOnboardingTitle, "sentiment"> & { sentiment: "liked" | "disliked" | "watchlist" }) =>
      mutate.mutate({ action: "feedback", ...payload }),
    complete: () => mutate.mutate({ action: "complete" }),
    isSaving: mutate.isPending,
  };
}
