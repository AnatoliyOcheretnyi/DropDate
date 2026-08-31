"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchHomeSections } from "../../home/api/homeApi";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";

/**
 * Imagery for the hub. The cards are supposed to show the same pool the games
 * draw from, so this prefers the player's own library and falls back to
 * popular titles for guests and empty lists.
 */
export function useGamePosters() {
  const { saved } = useSavedReleases();
  const [fallback, setFallback] = useState<string[]>([]);

  const own = useMemo(() => {
    const posters = saved
      .map((item) => item.posterUrl)
      .filter((url): url is string => Boolean(url));
    const backdrops = saved
      .map((item) => item.backdropUrl)
      .filter((url): url is string => Boolean(url));
    return { posters, backdrops };
  }, [saved]);

  useEffect(() => {
    if (own.posters.length >= 6 || fallback.length > 0) {
      return;
    }
    let cancelled = false;
    void fetchHomeSections()
      .then((sections) => {
        if (cancelled) {
          return;
        }
        setFallback(
          sections.popularMovies
            .map((item) => item.posterUrl)
            .filter((url): url is string => Boolean(url))
            .slice(0, 24)
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [fallback.length, own.posters.length]);

  const posters = own.posters.length >= 6 ? own.posters : fallback;

  return {
    posters,
    backdrop: own.backdrops[0] ?? posters[0],
    /** Deterministic per-card slice, so cards do not reshuffle on every render. */
    sliceFor: (index: number, size = 3) =>
      posters.length === 0
        ? []
        : Array.from({ length: size }, (_, offset) => posters[(index * size + offset) % posters.length]),
  };
}
