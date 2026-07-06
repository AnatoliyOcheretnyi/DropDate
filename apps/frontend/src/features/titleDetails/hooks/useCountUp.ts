"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  duration?: number;
  enabled?: boolean;
};

/**
 * Animates a number from 0 up to `target` with an ease-out curve. Respects
 * reduced-motion by snapping straight to the final value.
 */
export function useCountUp(target: number, options?: Options) {
  const { duration = 900, enabled = true } = options ?? {};
  const [value, setValue] = useState(enabled ? 0 : target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || target === 0) {
      setValue(target);
      return;
    }

    const prefersReduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      setValue(target);
      return;
    }

    let start: number | undefined;
    const step = (timestamp: number) => {
      if (start === undefined) {
        start = timestamp;
      }
      const progress = Math.min(1, (timestamp - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [target, duration, enabled]);

  return value;
}
