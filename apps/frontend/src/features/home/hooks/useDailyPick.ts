"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage, requestApi } from "../../../shared/api/http";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { useAuth } from "../../../shared/state/auth";
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
      const response = await requestApi<DailyPickState>({
        url: "/api/recommendations/daily",
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      if (!response.ok || !response.payload) return null;
      return response.payload;
    },
    staleTime: 1000 * 60 * 60 * 12,
  });

  const update = useMutation({
    mutationFn: async (payload: {
      date?: string;
      revealed: boolean;
      action: "none" | "saved" | "disliked";
    }) => {
      const response = await requestApi<DailyPickState>({
        url: "/api/recommendations/daily",
        method: "POST",
        data: payload,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
      });
      if (!response.ok || !response.payload) {
        throw new Error(
          getApiErrorMessage(response.payload, "Не вдалося оновити фільм дня")
        );
      }
      return response.payload;
    },
    onSuccess: (next) => {
      queryClient.setQueryData(
        webQueryKeys.dailyPickState(user?.id ?? "guest", utcDate),
        next
      );
    },
  });

  const state = enabled ? query.data ?? null : null;
  const pick =
    state?.pick
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
    isUpdating: update.isPending,
    reveal: async () => {
      try {
        await update.mutateAsync({
          date: state?.date,
          revealed: true,
          action: state?.action ?? "none",
        });
        track("daily_pick_revealed", { mediaType: state?.pick?.mediaType ?? "unknown" });
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
