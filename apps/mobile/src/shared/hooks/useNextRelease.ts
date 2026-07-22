import { useCallback, useMemo, useState } from "react";
import type { ReleaseInfo } from "../types/release";
import { getBackendURL } from "../utils/config";
import { copy } from "../strings";

type SearchParams = {
  title: string;
  tmdbId?: number;
  mediaType?: string;
};

export function useNextRelease() {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const backendUrl = useMemo(() => getBackendURL(), []);

  const search = useCallback(
    async ({ title, tmdbId, mediaType }: SearchParams) => {
      const trimmed = title.trim();
      if (!trimmed) {
        setError(copy.errors.missingTitle);
        setRelease(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("title", trimmed);
        if (tmdbId) {
          params.set("tmdbId", String(tmdbId));
        }
        if (mediaType) {
          params.set("mediaType", mediaType);
        }

        const url = `${backendUrl}/next-release?${params.toString()}`;

        const response = await fetch(url, {
          headers: { accept: "application/json" },
        });

        const payload = await response
          .json()
          .catch(() => ({ message: copy.errors.invalidJson }));

        if (!response.ok) {
          throw new Error(payload?.message || copy.errors.searchFailed);
        }

        setRelease(payload as ReleaseInfo);
      } catch (fetchError) {
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : copy.errors.backendUnavailable;
        setRelease(null);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [backendUrl],
  );

  return { release, error, isLoading, search };
}
