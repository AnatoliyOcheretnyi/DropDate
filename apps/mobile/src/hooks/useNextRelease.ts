import { useCallback, useMemo, useState } from 'react';
import type { ReleaseInfo } from '../types/release';

const DEFAULT_BACKEND_URL = 'http://localhost:8080';

export function useNextRelease() {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const backendUrl = useMemo(
    () => process.env.EXPO_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL,
    []
  );

  const search = useCallback(
    async (title: string) => {
      const trimmed = title.trim();
      if (!trimmed) {
        setError('Please enter a title first.');
        setRelease(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const safeBase = backendUrl.replace(/\/$/, '');
        const url = `${safeBase}/next-release?title=${encodeURIComponent(trimmed)}`;

        const response = await fetch(url, {
          headers: { accept: 'application/json' },
        });

        const payload = await response.json().catch(() => ({ message: 'Invalid JSON received' }));

        if (!response.ok) {
          throw new Error(payload?.message || 'Failed to fetch release info');
        }

        setRelease(payload as ReleaseInfo);
      } catch (fetchError) {
        const message =
          fetchError instanceof Error ? fetchError.message : 'Unable to reach DropDate backend';
        setRelease(null);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [backendUrl]
  );

  return { release, error, isLoading, search };
}
