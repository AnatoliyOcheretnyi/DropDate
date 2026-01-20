"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  NotificationItem,
  NotificationsResponse,
} from "../types/notifications";
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
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !accessToken || !hasFollowItems()) {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/notifications", {
        headers: {
          accept: "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });
      if (!response.ok) {
        setItems([]);
        setUnreadCount(0);
        return;
      }
      const payload = (await response.json()) as NotificationsResponse;
      setItems(payload.items || []);
      setUnreadCount(payload.unreadCount || 0);
    } catch {
      setItems([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, user]);

  const markAllRead = useCallback(async () => {
    if (!user || !accessToken) {
      return;
    }
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ all: true }),
      });
      const readAt = new Date().toISOString();
      setItems((prev) =>
        prev.map((item) =>
          item.readAt ? item : { ...item, readAt }
        )
      );
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }, [accessToken, user]);

  useEffect(() => {
    if (!user || !accessToken || !hasFollowItems()) {
      setItems(emptyState.items);
      setUnreadCount(emptyState.unreadCount);
      return;
    }
    refresh();
  }, [accessToken, refresh, user]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleUpdate = () => {
      refresh();
    };
    window.addEventListener("saved:updated", handleUpdate);
    return () => {
      window.removeEventListener("saved:updated", handleUpdate);
    };
  }, [refresh]);

  return {
    items,
    unreadCount,
    isLoading,
    refresh,
    markAllRead,
  };
}
