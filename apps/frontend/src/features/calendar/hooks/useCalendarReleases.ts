"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Suggestion } from "../../../shared/lib/release";
import type { ListType, SavedRelease } from "../../../shared/types/releases";
import { requestApi } from "../../../shared/api/http";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { useAuth } from "../../../shared/state/auth";
import type { NotificationsResponse } from "../../notifications/types/notifications";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";

export type CalendarMode = "week" | "month";

// Lists that represent titles the user is tracking / plans to watch, i.e. the
// "subscriptions" the calendar is built from. Status lists (favorite/watched/
// disliked) describe already-consumed titles and are intentionally excluded.
const SUBSCRIPTION_LISTS: ListType[] = ["follow", "watchlist"];

export type CalendarEvent = {
  id: string;
  tmdbId?: number;
  mediaType: Suggestion["mediaType"];
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  type: SavedRelease["type"];
  status: SavedRelease["status"];
  date: Date;
  dateKey: string;
};

export type CalendarDay = {
  date: Date;
  dateKey: string;
  dayNumber: number;
  weekdayLabel: string;
  isToday: boolean;
  isPast: boolean;
  isCurrentMonth: boolean;
  events: CalendarEvent[];
};

const MONTH_FMT = new Intl.DateTimeFormat("uk-UA", {
  month: "long",
  year: "numeric",
});
const RANGE_FMT = new Intl.DateTimeFormat("uk-UA", {
  day: "numeric",
  month: "short",
});
const WEEKDAY_FMT = new Intl.DateTimeFormat("uk-UA", { weekday: "short" });

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfToday = () => startOfDay(new Date());

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

// Monday-first start of the week containing `date`.
const startOfWeek = (date: Date) => {
  const start = startOfDay(date);
  const day = start.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(start, diff);
};

const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const capitalize = (value: string) =>
  value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);

export function useCalendarReleases() {
  const { saved, savedCount, isReady } = useSavedReleases();
  const { user, accessToken } = useAuth();
  const [mode, setMode] = useState<CalendarMode>("month");
  const [anchor, setAnchor] = useState<Date>(() => startOfToday());

  const today = useMemo(() => startOfToday(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);

  // Past releases are pulled from the persistent notifications log so they keep
  // showing on the calendar even after the title is removed from subscriptions
  // (notification rows are tied to the user, not to the saved list).
  const historyQuery = useQuery({
    queryKey: webQueryKeys.releaseHistory(user?.id ?? "guest"),
    enabled: Boolean(user && accessToken),
    queryFn: async ({ signal }) => {
      const response = await requestApi<NotificationsResponse>({
        url: "/api/notifications?limit=500",
        method: "GET",
        headers: { authorization: `Bearer ${accessToken}` },
        signal,
      });
      if (!response.ok) {
        return [] as NotificationsResponse["items"];
      }
      return response.payload?.items ?? [];
    },
    staleTime: 1000 * 60,
  });

  const historyItems = historyQuery.data;

  const subscriptionEvents = useMemo<CalendarEvent[]>(() => {
    const collected: CalendarEvent[] = [];
    saved.forEach((item) => {
      const lists =
        item.listTypes && item.listTypes.length > 0
          ? item.listTypes
          : (["follow"] as ListType[]);
      if (!lists.some((list) => SUBSCRIPTION_LISTS.includes(list))) {
        return;
      }
      if (!item.nextRelease) {
        return;
      }
      const parsed = new Date(item.nextRelease);
      if (Number.isNaN(parsed.getTime())) {
        return;
      }
      const localDate = startOfDay(parsed);
      collected.push({
        id: item.id,
        tmdbId: item.tmdbId,
        mediaType: item.mediaType || (item.type === "movie" ? "movie" : "tv"),
        title: item.title,
        posterUrl: item.posterUrl,
        backdropUrl: item.backdropUrl,
        type: item.type,
        status: item.status,
        date: localDate,
        dateKey: toDateKey(localDate),
      });
    });
    return collected;
  }, [saved]);

  const historyEvents = useMemo<CalendarEvent[]>(() => {
    if (!historyItems) {
      return [];
    }
    const collected: CalendarEvent[] = [];
    historyItems.forEach((item) => {
      if (!item.releaseDate) {
        return;
      }
      const parsed = new Date(item.releaseDate);
      if (Number.isNaN(parsed.getTime())) {
        return;
      }
      const localDate = startOfDay(parsed);
      collected.push({
        id: `history:${item.id}`,
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        title: item.title,
        posterUrl: item.posterUrl,
        backdropUrl: item.backdropUrl,
        type: item.mediaType === "movie" ? "movie" : "series",
        status: "released",
        date: localDate,
        dateKey: toDateKey(localDate),
      });
    });
    return collected;
  }, [historyItems]);

  const events = useMemo<CalendarEvent[]>(() => {
    const map = new Map<string, CalendarEvent>();
    const put = (event: CalendarEvent) => {
      const dedupKey = `${event.tmdbId ?? event.title}:${event.mediaType}:${event.dateKey}`;
      if (!map.has(dedupKey)) {
        map.set(dedupKey, event);
      }
    };
    // Subscriptions win over history for the same title/date (they carry live
    // status and link back to the saved item id).
    subscriptionEvents.forEach(put);
    historyEvents.forEach(put);
    return Array.from(map.values());
  }, [subscriptionEvents, historyEvents]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const bucket = map.get(event.dateKey);
      if (bucket) {
        bucket.push(event);
      } else {
        map.set(event.dateKey, [event]);
      }
    });
    map.forEach((bucket) =>
      bucket.sort((a, b) => a.title.localeCompare(b.title, "uk"))
    );
    return map;
  }, [events]);

  const buildDay = useCallback(
    (date: Date, monthRef: number): CalendarDay => {
      const dateKey = toDateKey(date);
      return {
        date,
        dateKey,
        dayNumber: date.getDate(),
        weekdayLabel: capitalize(WEEKDAY_FMT.format(date)),
        isToday: dateKey === todayKey,
        isPast: date < today,
        isCurrentMonth: date.getMonth() === monthRef,
        events: eventsByDay.get(dateKey) || [],
      };
    },
    [eventsByDay, today, todayKey]
  );

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, index) =>
      buildDay(addDays(start, index), anchor.getMonth())
    );
  }, [anchor, buildDay]);

  const monthWeeks = useMemo(() => {
    const monthRef = anchor.getMonth();
    const gridStart = startOfWeek(startOfMonth(anchor));
    const lastDay = new Date(anchor.getFullYear(), monthRef + 1, 0);
    const weeks: CalendarDay[][] = [];
    let cursor = gridStart;
    while (cursor <= lastDay || weeks.length === 0) {
      const row = Array.from({ length: 7 }, (_, index) =>
        buildDay(addDays(cursor, index), monthRef)
      );
      weeks.push(row);
      cursor = addDays(cursor, 7);
    }
    return weeks;
  }, [anchor, buildDay]);

  const periodDays = useMemo(
    () => (mode === "week" ? weekDays : monthWeeks.flat()),
    [mode, weekDays, monthWeeks]
  );

  const periodEventCount = useMemo(() => {
    if (mode === "week") {
      return weekDays.reduce((sum, day) => sum + day.events.length, 0);
    }
    const monthRef = anchor.getMonth();
    return events.filter((event) => event.date.getMonth() === monthRef).length;
  }, [mode, weekDays, events, anchor]);

  const upcomingCount = useMemo(
    () => events.filter((event) => event.date >= today).length,
    [events, today]
  );

  const periodLabel = useMemo(() => {
    if (mode === "month") {
      return capitalize(MONTH_FMT.format(anchor));
    }
    const start = startOfWeek(anchor);
    const end = addDays(start, 6);
    return `${RANGE_FMT.format(start)} – ${RANGE_FMT.format(end)}`;
  }, [anchor, mode]);

  const weekdayLabels = useMemo(() => {
    const monday = startOfWeek(new Date(2024, 0, 1)); // any Monday reference
    return Array.from({ length: 7 }, (_, index) =>
      capitalize(WEEKDAY_FMT.format(addDays(monday, index)))
    );
  }, []);

  const goPrev = useCallback(() => {
    setAnchor((current) =>
      mode === "week"
        ? addDays(current, -7)
        : new Date(current.getFullYear(), current.getMonth() - 1, 1)
    );
  }, [mode]);

  const goNext = useCallback(() => {
    setAnchor((current) =>
      mode === "week"
        ? addDays(current, 7)
        : new Date(current.getFullYear(), current.getMonth() + 1, 1)
    );
  }, [mode]);

  const goToday = useCallback(() => setAnchor(startOfToday()), []);

  const focusDay = useCallback((date: Date) => {
    setMode("week");
    setAnchor(startOfDay(date));
  }, []);

  const isTodayInView = useMemo(
    () => periodDays.some((day) => day.isToday),
    [periodDays]
  );

  return {
    mode,
    setMode,
    anchor,
    weekDays,
    monthWeeks,
    weekdayLabels,
    periodLabel,
    periodEventCount,
    upcomingCount,
    totalCount: events.length,
    savedCount,
    isReady,
    isTodayInView,
    goPrev,
    goNext,
    goToday,
    focusDay,
  };
}
