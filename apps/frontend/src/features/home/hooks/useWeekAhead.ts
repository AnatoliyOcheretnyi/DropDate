"use client";

import { useMemo } from "react";
import type { ListType } from "../../../shared/types/releases";
import type { Suggestion } from "../../../shared/lib/release";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";

/**
 * Lists that mean "I am waiting for this". Status lists (watched, favorite,
 * disliked) describe titles already consumed, so they never produce a calendar
 * entry -- the same rule the full calendar screen uses.
 */
const SUBSCRIPTION_LISTS: ListType[] = ["follow", "watchlist"];

const DAYS = 7;

export type WeekEvent = {
  id: string;
  tmdbId?: number;
  mediaType: Suggestion["mediaType"];
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  isSeries: boolean;
};

export type WeekDay = {
  dateKey: string;
  date: Date;
  weekdayLabel: string;
  dayLabel: string;
  isToday: boolean;
  events: WeekEvent[];
};

const WEEKDAY_FMT = new Intl.DateTimeFormat("uk-UA", { weekday: "short" });
const DAY_FMT = new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long" });

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const stripDot = (value: string) => value.replace(/\.$/, "");

/**
 * The seven days starting today, filled from the user's tracked titles.
 *
 * This is a rolling window, not the Monday-based calendar week the /calendar
 * screen shows: on the home page "what's coming" should start now, not on a
 * Monday that may already be behind.
 */
export function useWeekAhead() {
  const { saved, isReady } = useSavedReleases();

  return useMemo(() => {
    const today = startOfDay(new Date());
    const todayKey = toDateKey(today);
    const horizon = addDays(today, DAYS - 1);

    const byDay = new Map<string, WeekEvent[]>();
    let trackedCount = 0;
    let nearest: Date | null = null;

    saved.forEach((item) => {
      const lists = item.listTypes?.length ? item.listTypes : (["follow"] as ListType[]);
      if (!lists.some((list) => SUBSCRIPTION_LISTS.includes(list))) {
        return;
      }
      trackedCount += 1;

      if (!item.nextRelease) {
        return;
      }
      const parsed = new Date(item.nextRelease);
      if (Number.isNaN(parsed.getTime())) {
        return;
      }
      const day = startOfDay(parsed);
      if (day >= today && (nearest === null || day < nearest)) {
        nearest = day;
      }
      if (day < today || day > horizon) {
        return;
      }

      const key = toDateKey(day);
      const event: WeekEvent = {
        id: item.id,
        tmdbId: item.tmdbId,
        mediaType: item.mediaType || (item.type === "movie" ? "movie" : "tv"),
        title: item.title,
        posterUrl: item.posterUrl,
        backdropUrl: item.backdropUrl,
        isSeries: item.type !== "movie",
      };
      const bucket = byDay.get(key);
      if (bucket) {
        bucket.push(event);
      } else {
        byDay.set(key, [event]);
      }
    });

    const days: WeekDay[] = Array.from({ length: DAYS }, (_, index) => {
      const date = addDays(today, index);
      const dateKey = toDateKey(date);
      return {
        dateKey,
        date,
        weekdayLabel: stripDot(WEEKDAY_FMT.format(date)).toUpperCase(),
        dayLabel: DAY_FMT.format(date),
        isToday: dateKey === todayKey,
        // Two per day, as designed -- more would make the columns ragged.
        events: (byDay.get(dateKey) ?? []).slice(0, 2),
      };
    });

    return { days, trackedCount, nearestRelease: nearest as Date | null, isReady };
  }, [saved, isReady]);
}
