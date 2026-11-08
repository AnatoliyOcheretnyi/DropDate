"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "../../../shared/api/http";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { fetchWithAuth, useAuth } from "../../../shared/state/auth";
import { track } from "../../../shared/lib/analytics";

export type DailyPick = {
  date: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year?: string;
  posterUrl?: string;
  reason: { text?: string };
};

export type DailyPickState = {
  date: string;
  pick?: Omit<DailyPick, "date">;
  revealed: boolean;
  action: "none" | "saved" | "disliked";
  emptyReason?: "insufficient_data" | "exhausted";
};

export function useDailyPick() {
  const { accessToken, user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = Boolean(accessToken && user?.id);
  const utcDate = new Date().toISOString().slice(0, 10);
  const query = useQuery({
    queryKey: webQueryKeys.dailyPickState(user?.id ?? "guest", utcDate),
    enabled,
    queryFn: async ({ signal }) => {
      const response = await fetchWithAuth("/api/recommendations/daily", {
        signal,
      });
      if (!response.ok) throw new Error("Не вдалося завантажити фільм дня");
      return (await response.json()) as DailyPickState;
    },
    staleTime: 60_000,
    refetchOnMount: "always",
  });

  const update = useMutation({
    mutationFn: async (payload: {
      date?: string;
      revealed: boolean;
      action: "none" | "saved" | "disliked";
    }) => {
      const response = await fetchWithAuth("/api/recommendations/daily", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "content-type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Не вдалося оновити фільм дня");
      }
      return (await response.json()) as DailyPickState;
    },
    onSuccess: (next) => {
      queryClient.setQueryData(
        webQueryKeys.dailyPickState(user?.id ?? "guest", utcDate),
        next,
      );
    },
  });

  const state = enabled ? (query.data ?? null) : null;
  const pick = state?.pick
    ? {
        date: state.date,
        tmdbId: state.pick.tmdbId,
        mediaType: state.pick.mediaType,
        title: state.pick.title,
        year: state.pick.year,
        posterUrl: state.pick.posterUrl,
        reason: state.pick.reason,
      }
    : null;

  return {
    pick,
    state,
    isLoading: query.isLoading,
    isEmpty: enabled && query.isSuccess && !query.data?.pick && query.data?.emptyReason === "insufficient_data",
    isUnavailable: enabled && !query.data?.pick && (query.isError || (query.isSuccess && query.data?.emptyReason !== "insufficient_data")),
    retry: () => query.refetch(),
    isRetrying: query.isFetching,
    isUpdating: update.isPending,
    reveal: async () => {
      try {
        await update.mutateAsync({
          date: state?.date,
          revealed: true,
          action: state?.action ?? "none",
        });
        track("daily_pick_revealed", {
          mediaType: state?.pick?.mediaType ?? "unknown",
        });
        return { ok: true as const, message: "" };
      } catch (error) {
        return {
          ok: false as const,
          message: getApiErrorMessage(error, "Не вдалося оновити фільм дня"),
        };
      }
    },
    setAction: async (action: "saved" | "disliked") => {
      try {
        await update.mutateAsync({
          date: state?.date,
          revealed: true,
          action,
        });
        track(action === "saved" ? "daily_pick_saved" : "daily_pick_disliked", {
          mediaType: state?.pick?.mediaType ?? "unknown",
        });
        return { ok: true as const, message: "" };
      } catch (error) {
        return {
          ok: false as const,
          message: getApiErrorMessage(error, "Не вдалося оновити фільм дня"),
        };
      }
    },
  };
}
