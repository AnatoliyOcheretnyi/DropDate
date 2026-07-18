"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { useAuth } from "../../../shared/state/auth";
import type { TasteKind } from "../store/tasteStore";

export type TasteItem = {
  id: string;
  score: number;
  comparisons: number;
  confidence: number;
};

export type TastePair = {
  kind: TasteKind;
  left: string;
  right: string;
  round: number;
};

type Winner = "left" | "right" | "tie";

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Не вдалося оновити смак");
  }
  return payload as T;
}

export function useTasteTournament(kind: TasteKind) {
  const { user, accessToken } = useAuth();
  const queryClient = useQueryClient();
  const enabled = Boolean(user && accessToken);
  const key = webQueryKeys.taste(user?.id ?? "guest", kind);

  const rankings = useQuery({
    queryKey: key,
    enabled,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/taste?kind=${kind}`, {
        headers: { authorization: `Bearer ${accessToken}` },
        signal,
      });
      return parseResponse<{ items: TasteItem[] }>(response);
    },
  });

  const pair = useQuery({
    queryKey: [...key, "next"],
    enabled,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/taste/next?kind=${kind}`, {
        headers: { authorization: `Bearer ${accessToken}` },
        signal,
      });
      return parseResponse<TastePair>(response);
    },
  });

  const comparison = useMutation({
    mutationFn: async (winner: Winner) => {
      if (!pair.data) {
        throw new Error("Пара для порівняння ще не готова");
      }
      const response = await fetch(`/api/taste?kind=${kind}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          left: pair.data.left,
          right: pair.data.right,
          winner,
        }),
      });
      return parseResponse<TastePair>(response);
    },
    onSuccess: (nextPair) => {
      queryClient.setQueryData([...key, "next"], nextPair);
      void queryClient.invalidateQueries({ queryKey: key, exact: true });
      void queryClient.invalidateQueries({
        queryKey: webQueryKeys.recommendations(user?.id ?? "guest"),
      });
    },
  });

  const items = rankings.data?.items ?? [];
  const comparisons = items.reduce((total, item) => total + item.comparisons, 0) / 2;
  const confidence = items.length
    ? items.reduce((total, item) => total + item.confidence, 0) / items.length
    : 0;

  return {
    items,
    pair: pair.data,
    comparisons,
    confidence,
    isLoading: rankings.isLoading || pair.isLoading,
    isSaving: comparison.isPending,
    error: comparison.error?.message || rankings.error?.message || pair.error?.message,
    compare: comparison.mutate,
  };
}
