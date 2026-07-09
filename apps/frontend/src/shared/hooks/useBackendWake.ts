"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export type WakeStatus = "probing" | "waking" | "ready" | "idle";

// Warm loads answer well under this, so the overlay never flashes on them.
const GRACE_MS = 1200;
// How long "Готово!" stays up before the overlay releases the page.
const READY_MS = 900;
const BACKOFF_START_MS = 900;
const BACKOFF_STEP_MS = 700;
const BACKOFF_MAX_MS = 5000;

const ping = async () => {
  const response = await fetch("/api/health", {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  return response.ok;
};

/**
 * Polls /api/health until the backend answers. Reports "waking" only once the
 * grace period has elapsed without a healthy reply, so a warm backend produces
 * no visible state change at all.
 */
export function useBackendWake() {
  const [status, setStatus] = useState<WakeStatus>("probing");
  const [waitedMs, setWaitedMs] = useState(0);
  const queryClient = useQueryClient();

  const startedAt = useRef(0);
  const attempts = useRef(0);
  const stopped = useRef(false);
  const timers = useRef<number[]>([]);

  const later = useCallback((fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    timers.current.push(id);
  }, []);

  const finish = useCallback(() => {
    // Every page's data was fetched (or failed) while the backend slept.
    queryClient.invalidateQueries();
    setStatus("ready");
    later(() => setStatus("idle"), READY_MS);
  }, [later, queryClient]);

  useEffect(() => {
    // Refs survive StrictMode's mount/unmount/remount, so the previous run's
    // cleanup would otherwise leave this effect permanently stopped.
    stopped.current = false;
    attempts.current = 0;
    startedAt.current = Date.now();

    const tick = async () => {
      if (stopped.current) return;
      attempts.current += 1;

      let healthy = false;
      try {
        healthy = await ping();
      } catch {
        healthy = false;
      }
      if (stopped.current) return;

      if (healthy) {
        // Never woke anything up: the first probe came back in time.
        if (attempts.current === 1 && Date.now() - startedAt.current < GRACE_MS) {
          setStatus("idle");
          return;
        }
        finish();
        return;
      }

      if (Date.now() - startedAt.current >= GRACE_MS) {
        setStatus("waking");
      }
      const delay = Math.min(
        BACKOFF_MAX_MS,
        BACKOFF_START_MS + attempts.current * BACKOFF_STEP_MS
      );
      later(tick, delay);
    };

    // If the very first probe is still in flight past the grace period, the
    // backend is almost certainly cold — show the overlay without waiting.
    later(() => {
      if (!stopped.current) {
        setStatus((prev) => (prev === "probing" ? "waking" : prev));
      }
    }, GRACE_MS);

    void tick();

    const clock = window.setInterval(() => {
      setWaitedMs(Date.now() - startedAt.current);
    }, 250);

    return () => {
      stopped.current = true;
      window.clearInterval(clock);
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
  }, [finish, later]);

  return { status, waitedMs };
}
