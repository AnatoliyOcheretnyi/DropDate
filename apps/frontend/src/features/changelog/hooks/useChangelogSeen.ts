"use client";

import { useCallback, useEffect, useState } from "react";
import { changelogEntries } from "../data/releases";

const STORAGE_KEY = "dropdate:changelog-seen";

export const latestChangelogVersion = changelogEntries[0]?.version ?? "";

/**
 * The dot next to "Що нового" is the only signal that a release happened, so
 * it is driven by the newest entry in the changelog rather than by a flag the
 * backend would have to keep in sync.
 */
export function useChangelogSeen() {
  // `undefined` means storage has not been read yet; `null` means it was read
  // and holds nothing (a first-time visitor, who does have unseen releases).
  const [seen, setSeen] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    try {
      setSeen(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      setSeen(latestChangelogVersion);
    }
  }, []);

  const markSeen = useCallback(() => {
    setSeen(latestChangelogVersion);
    try {
      window.localStorage.setItem(STORAGE_KEY, latestChangelogVersion);
    } catch {
      // A blocked storage only costs the dot, never the navigation.
    }
  }, []);

  // Until the stored value is read, assume everything is seen: a dot that
  // flashes on every mount is worse than one that appears a tick late.
  const hasUnseen = seen !== undefined && seen !== latestChangelogVersion;

  return { hasUnseen, markSeen };
}
