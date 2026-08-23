"use client";

import { useQuery } from "@tanstack/react-query";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import type { Details, Suggestion } from "../../../shared/lib/release";
import { fetchDetails } from "../../titleDetails/api/detailsApi";

/**
 * Loads the full record for the hero's featured title.
 *
 * The home payload only carries a Suggestion (id, title, poster), but the hero
 * needs the backdrop, synopsis, genres and release date. Those live behind
 * /details, so the hero renders from the suggestion first and fills in as the
 * details arrive -- there is no spinner state, just a progressively richer hero.
 */
export function useSpotlightDetails(spotlight: Suggestion | null) {
  return useQuery<Details | null>({
    queryKey: webQueryKeys.details(
      spotlight?.mediaType ?? "none",
      spotlight?.id ?? 0
    ),
    enabled: Boolean(spotlight),
    staleTime: 1000 * 60 * 30,
    queryFn: async ({ signal }) => {
      if (!spotlight) {
        return null;
      }
      const response = await fetchDetails(
        spotlight.id,
        spotlight.mediaType,
        signal
      );
      return response.payload?.details ?? null;
    },
  });
}

/**
 * The moment the featured title becomes available, as a timestamp.
 *
 * For a series the next episode is the meaningful date; for a film it is the
 * release date. Returns null when the date is missing or unparseable, which is
 * what tells the hero to hide the countdown rather than count toward nothing.
 */
export function spotlightReleaseAt(details: Details | null | undefined) {
  const raw =
    details?.mediaType === "tv"
      ? details?.nextAirDate || details?.firstAirDate
      : details?.releaseDate;
  if (!raw) {
    return null;
  }
  const parsed = Date.parse(`${raw}T00:00:00`);
  return Number.isNaN(parsed) ? null : parsed;
}
