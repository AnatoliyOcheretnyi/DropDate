"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "dropdate.games.stats.v1";

export type GameStats = {
  plays: number;
  bestScore: number;
  bestStreak: number;
  lastPlayedAt: string;
};

const emptyStats: GameStats = {
  plays: 0,
  bestScore: 0,
  bestStreak: 0,
  lastPlayedAt: "",
};

type StatsMap = Record<string, GameStats>;

const readAll = (): StatsMap => {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StatsMap) : {};
  } catch {
    return {};
  }
};

const writeAll = (map: StatsMap) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Private mode / quota — stats are a nicety, ignore.
  }
};

/**
 * Personal per-game results kept in localStorage: play count, best score and
 * best streak. Purely local — no backend involved.
 */
export function useGameStats(gameId: string) {
  const [stats, setStats] = useState<GameStats>(emptyStats);

  useEffect(() => {
    setStats(readAll()[gameId] ?? emptyStats);
  }, [gameId]);

  const record = useCallback(
    (result: { score?: number; streak?: number }) => {
      const map = readAll();
      const prev = map[gameId] ?? emptyStats;
      const next: GameStats = {
        plays: prev.plays + 1,
        bestScore: Math.max(prev.bestScore, result.score ?? 0),
        bestStreak: Math.max(prev.bestStreak, result.streak ?? 0),
        lastPlayedAt: new Date().toISOString(),
      };
      map[gameId] = next;
      writeAll(map);
      setStats(next);
    },
    [gameId]
  );

  return { stats, record };
}

/** Read-only snapshot of every game's stats (hub cards). */
export function useAllGameStats(): StatsMap {
  const [map, setMap] = useState<StatsMap>({});
  useEffect(() => {
    setMap(readAll());
  }, []);
  return map;
}
