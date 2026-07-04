"use client";

import { useCallback, useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { NotificationsResponse } from "../types/notifications";
import { requestApi, webApi } from "../../../shared/api/http";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { useAuth } from "../../../shared/state/auth";
import { STORAGE_KEY } from "../../../shared/types/releases";

const emptyState = { items: [], unreadCount: 0 } satisfies NotificationsResponse;

const hasFollowItems = () => {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return false;
    }
    const parsed = JSON.parse(raw) as Array<{
      listTypes?: string[];
    }>;
    return parsed.some((item) => {
      if (!item.listTypes || item.listTypes.length === 0) {
        return true;
      }
      return item.listTypes.includes("follow");
    });
  } catch {
    return false;
  }
};

export function useNotifications() {
  const { user, accessToken } = useAuth();
  const queryClient = useQueryClient();
  const enabled = Boolean(user && accessToken && hasFollowItems());

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
        }
      );
    },
    onSuccess: () => {
      const readAt = new Date().toISOString();
      queryClient.setQueryData<NotificationsResponse>(
        webQueryKeys.notifications(user?.id ?? "guest"),
        (previous) => ({
          items:
            previous?.items.map((item) =>
              item.readAt ? item : { ...item, readAt }
            ) ?? [],
          unreadCount: 0,
        })
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

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const handleUpdate = () => {
      void notificationsQuery.refetch();
    };
    window.addEventListener("saved:updated", handleUpdate);
    return () => {
      window.removeEventListener("saved:updated", handleUpdate);
    };
  }, [enabled, notificationsQuery]);

  return {
    items: enabled ? notificationsQuery.data?.items ?? [] : emptyState.items,
    unreadCount: enabled
      ? notificationsQuery.data?.unreadCount ?? 0
      : emptyState.unreadCount,
    isLoading: notificationsQuery.isLoading || markAllReadMutation.isPending,
    refresh,
    markAllRead,
  };
}
