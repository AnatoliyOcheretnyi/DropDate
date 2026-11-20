"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Suggestion } from "../../../shared/lib/release";

const keyOf = (item: Suggestion) => `${item.mediaType}:${item.id}`;
const EXIT_MS = 220;
const useBrowserLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;
type Entry<T> = { item: T; exiting: boolean };

/** Preserve keyed cards through removal, then slide their neighbours into place. */
export function AnimatedMovieRail<T extends Suggestion>({
  items,
  className,
  itemClassName,
  ranked = false,
  retainExits = true,
  busy = false,
  empty,
  children,
}: {
  items: T[];
  className: string;
  itemClassName: string;
  ranked?: boolean;
  retainExits?: boolean;
  busy?: boolean;
  empty?: ReactNode;
  children: (item: T, index: number) => ReactNode;
}) {
  const [entries, setEntries] = useState<Entry<T>[]>(() =>
    items.map((item) => ({ item, exiting: false })),
  );
  const rowRef = useRef<HTMLOListElement & HTMLDivElement>(null);
  const positions = useRef(
    new Map<string, { x: number; y: number; exiting: boolean }>(),
  );
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useBrowserLayoutEffect(() => {
    const desired = new Set(items.map(keyOf));
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setEntries((previous) => {
      const next = items.map((item) => ({ item, exiting: false }));
      if (retainExits && !reduceMotion) {
        previous.forEach((entry, index) => {
          if (!desired.has(keyOf(entry.item))) {
            next.splice(Math.min(index, next.length), 0, {
              ...entry,
              exiting: true,
            });
          }
        });
      }
      return next.length === previous.length &&
        next.every(
          (entry, index) =>
            entry.item === previous[index].item &&
            entry.exiting === previous[index].exiting,
        )
        ? previous
        : next;
    });
  }, [items, retainExits]);

  useEffect(() => {
    const pending = timers.current;
    const exiting = new Set(
      entries
        .filter((entry) => entry.exiting)
        .map((entry) => keyOf(entry.item)),
    );
    for (const [key, timer] of pending) {
      if (!exiting.has(key)) {
        clearTimeout(timer);
        pending.delete(key);
      }
    }
    for (const key of exiting) {
      if (pending.has(key)) continue;
      pending.set(
        key,
        setTimeout(() => {
          pending.delete(key);
          setEntries((current) =>
            current.filter(
              (entry) => keyOf(entry.item) !== key || !entry.exiting,
            ),
          );
        }, EXIT_MS),
      );
    }
  }, [entries]);
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  useBrowserLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const next = new Map<string, { x: number; y: number; exiting: boolean }>();
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    for (const child of Array.from(row.children) as HTMLElement[]) {
      const key = child.dataset.railKey;
      if (!key) continue;
      const previous = positions.current.get(key);
      const current = {
        x: child.offsetLeft,
        y: child.offsetTop,
        exiting: child.dataset.exiting === "true",
      };
      next.set(key, current);
      if (reduceMotion || !child.animate) continue;
      if (current.exiting) {
        if (!previous?.exiting)
          child.animate(
            [
              { opacity: 1, transform: "scale(1)" },
              { opacity: 0, transform: "scale(.94) translateY(8px)" },
            ],
            { duration: EXIT_MS, fill: "forwards", easing: "ease-in" },
          );
      } else if (!previous || previous.exiting) {
        child.getAnimations().forEach((animation) => animation.cancel());
        child.animate(
          [
            { opacity: 0, transform: "translateY(8px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 320, easing: "ease-out" },
        );
      } else if (previous.x !== current.x || previous.y !== current.y) {
        child.getAnimations().forEach((animation) => animation.cancel());
        child.animate(
          [
            {
              transform: `translate(${previous.x - current.x}px, ${previous.y - current.y}px)`,
            },
            { transform: "translate(0, 0)" },
          ],
          { duration: 320, easing: "cubic-bezier(.22, 1, .36, 1)" },
        );
      }
    }
    positions.current = next;
  }, [entries]);

  const Row = ranked ? "ol" : "div";
  const Item = ranked ? "li" : "article";
  return (
    <Row ref={rowRef} className={className} aria-busy={busy}>
      {entries.map(({ item, exiting }, index) => (
        <Item
          key={keyOf(item)}
          data-rail-key={keyOf(item)}
          data-exiting={exiting}
          className={itemClassName}
          ref={(element) => {
            if (element) element.inert = exiting;
          }}
          aria-hidden={exiting || undefined}
        >
          {children(item, index)}
        </Item>
      ))}
      {!entries.length ? empty : null}
    </Row>
  );
}
