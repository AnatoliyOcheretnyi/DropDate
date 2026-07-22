"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationsResponse } from "../types/notifications";
import { requestApi, webApi } from "../../../shared/api/http";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { useAuth } from "../../../shared/state/auth";
import { useSavedStore } from "../../saved/store/savedStore";
import { hasFollowItems } from "../../saved/utils/savedState";

const emptyState = {
  items: [],
  unreadCount: 0,
} satisfies NotificationsResponse;

export function useNotifications() {
  const { user, accessToken } = useAuth();
  const saved = useSavedStore((state) => state.saved);
  const queryClient = useQueryClient();
  const enabled = Boolean(user && accessToken && hasFollowItems(saved));

  const notificationsQuery = useQuery({
    queryKey: webQueryKeys.notifications(user?.id ?? "guest"),
    enabled,
    queryFn: async ({ signal }) => {
      const response = await requestApi<NotificationsResponse>({
        url: "/api/notifications",
        method: "GET",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        signal,
      });

      if (!response.ok) {
        return emptyState;
      }

      return {
        items: response.payload?.items || [],
        unreadCount: response.payload?.unreadCount || 0,
      };
    },
    staleTime: 1000 * 30,
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user || !accessToken) {
        return;
      }

      await webApi.post(
        "/api/notifications/read",
        { all: true },
        {
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${accessToken}`,
          },
        },
      );
    },
    onSuccess: () => {
      const readAt = new Date().toISOString();
      queryClient.setQueryData<NotificationsResponse>(
        webQueryKeys.notifications(user?.id ?? "guest"),
        (previous) => ({
          items:
            previous?.items.map((item) =>
              item.readAt ? item : { ...item, readAt },
            ) ?? [],
          unreadCount: 0,
        }),
      );
    },
  });

  const refresh = useCallback(async () => {
    if (!enabled) {
      return emptyState;
    }
    const result = await notificationsQuery.refetch();
    return result.data ?? emptyState;
  }, [enabled, notificationsQuery]);

  const markAllRead = useCallback(async () => {
    if (!enabled) {
      return;
    }
    await markAllReadMutation.mutateAsync();
  }, [enabled, markAllReadMutation]);

  return {
    // Show whatever the query has fetched, even if `enabled` momentarily
    // flips false (e.g. the saved store empties for a beat during a token
    // refresh or reconcile). Gating the *display* on `enabled` made an open
    // notifications popover blank out a couple seconds after opening.
    items: notificationsQuery.data?.items ?? emptyState.items,
    unreadCount: notificationsQuery.data?.unreadCount ?? emptyState.unreadCount,
    isLoading: notificationsQuery.isLoading || markAllReadMutation.isPending,
    refresh,
    markAllRead,
  };
}
