"use client";

import { useMemo, useRef } from "react";
import type { Suggestion } from "./release";
import type { ListType } from "../types/releases";

/**
 * Discovery blocks exist to show something new, so a title already sitting in
 * one of the user's lists takes a slot without adding a choice — `follow`
 * included, it is still a list the user put the title in.
 *
 * The catch is *when* that rule is applied. Judged live, saving a title makes
 * it vanish from under the finger that just saved it: the row reflows, the
 * confirmation is never seen, and it reads as a bug rather than as a rule. So
 * the rule is applied once per title, at the moment it first arrives on screen:
 * what was already there stays and picks up its list badge, and the next page —
 * or the next search — is the one that leaves it out.
 */
const itemKey = (item: Suggestion) => `${item.mediaType}:${item.id}`;

/**
 * selectUnsaved keeps every title that is either already on screen (`admitted`)
 * or in no list right now, and returns the widened admitted set alongside.
 */
export function selectUnsaved(
  items: Suggestion[],
  getListTypes: (suggestion: Suggestion) => ListType[],
  admitted: ReadonlySet<string>
): { items: Suggestion[]; admitted: Set<string> } {
  const next = new Set(admitted);
  const kept = items.filter((item) => {
    const key = itemKey(item);
    if (next.has(key)) {
      return true;
    }
    if (getListTypes(item).length > 0) {
      return false;
    }
    next.add(key);
    return true;
  });
  return { items: kept, admitted: next };
}

type Options = {
  /**
   * Changing it forgets what was on screen — a new search, or a new title on
   * the details page, starts over and re-applies the rule from scratch.
   */
  resetKey?: string;
  /**
   * The saved list arrives asynchronously. Admitting titles before it lands
   * would freeze the "not in any list" verdict while everything still looks
   * unsaved, and nothing would ever be filtered again.
   */
  isReady?: boolean;
};

/**
 * useUnsavedItems is the sticky form of the rule above: the filter re-runs when
 * new items arrive, not when the saved list changes.
 */
export function useUnsavedItems(
  items: Suggestion[],
  getListTypes: (suggestion: Suggestion) => ListType[],
  { resetKey = "", isReady = true }: Options = {}
): { items: Suggestion[]; hiddenCount: number } {
  // Read through a ref so a save — which hands us a new getListTypes — does not
  // re-run the filter over titles that are already on screen.
  const listTypesRef = useRef(getListTypes);
  listTypesRef.current = getListTypes;

  const admittedRef = useRef<{ resetKey: string; keys: Set<string> }>({
    resetKey,
    keys: new Set(),
  });

  return useMemo(() => {
    if (!isReady) {
      return { items, hiddenCount: 0 };
    }
    if (admittedRef.current.resetKey !== resetKey) {
      admittedRef.current = { resetKey, keys: new Set() };
    }
    const result = selectUnsaved(items, listTypesRef.current, admittedRef.current.keys);
    admittedRef.current.keys = result.admitted;
    return { items: result.items, hiddenCount: items.length - result.items.length };
  }, [items, isReady, resetKey]);
}
