"use client";

import { useEffect, useState } from "react";
import type { Suggestion } from "../../../shared/lib/release";
import { useAuth } from "../../../shared/state/auth";

// Minimum items required before we surface the personalized row, per spec.
const MIN_VISIBLE = 6;

type RecommendationItem = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year?: string;
  posterUrl?: string;
};

const toSuggestion = (item: RecommendationItem): Suggestion => ({
  id: item.tmdbId,
  title: item.title,
  mediaType: item.mediaType,
  year: item.year,
  posterUrl: item.posterUrl,
});

/**
 * useRecommendations loads the personalized "Recommended for you" feed for the
 * authenticated user. It returns an empty list for logged-out or low-signal
 * users so the home page degrades to the generic experience.
 */
export function useRecommendations() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      setItems([]);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    setIsLoading(true);

    fetch("/api/recommendations/me?limit=18", {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          return [] as RecommendationItem[];
        }
        const payload = (await response.json().catch(() => null)) as {
          items?: RecommendationItem[];
        } | null;
        return Array.isArray(payload?.items) ? payload!.items : [];
      })
      .then((rawItems) => {
        if (!isMounted) {
          return;
        }
        const suggestions =
          rawItems.length >= MIN_VISIBLE ? rawItems.map(toSuggestion) : [];
        setItems(suggestions);
      })
      .catch(() => {
        if (isMounted) {
          setItems([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [accessToken]);

  return { items, isLoading };
}
