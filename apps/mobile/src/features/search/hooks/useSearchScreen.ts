import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Details, ReleaseInfo, Suggestion } from '../../../shared/types/release';
import { getBackendURL } from '../../../shared/utils/config';
import { buildFallbackRelease } from '../../../shared/utils/release';
import { useSaved } from '../../saved/store/savedStore';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';

type SearchPayload = {
  results: Suggestion[];
  page: number;
  totalPages: number;
  totalResults: number;
};

type DetailsPayload = {
  details: Details;
  release?: ReleaseInfo;
};

export function useSearchScreen() {
  const backendURL = useMemo(() => getBackendURL(), []);
  const { addRelease, isSuggestionSaved } = useSaved();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv'>('all');

  const loadResults = useCallback(
    async (nextPage: number, append: boolean) => {
      if (!debouncedQuery) {
        setResults([]);
        setPage(1);
        setTotalPages(1);
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch(
          `${backendURL}/search?query=${encodeURIComponent(debouncedQuery)}&page=${nextPage}`,
          { headers: { accept: 'application/json' } }
        );
        const payload = (await response.json()) as SearchPayload;
        if (!response.ok) {
          setResults([]);
          setPage(1);
          setTotalPages(1);
          return;
        }
        setResults((prev) => (append ? [...prev, ...payload.results] : payload.results));
        setPage(payload.page || nextPage);
        setTotalPages(payload.totalPages || 1);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [backendURL, debouncedQuery]
  );

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setPage(1);
      setTotalPages(1);
      return;
    }
    setPage(1);
    loadResults(1, false);
  }, [debouncedQuery, loadResults]);

  const handleAdd = useCallback(
    async (item: Suggestion) => {
      if (isSuggestionSaved(item)) {
        return;
      }
      try {
        const response = await fetch(
          `${backendURL}/details?tmdbId=${item.id}&mediaType=${item.mediaType}`,
          { headers: { accept: 'application/json' } }
        );
        const payload = (await response.json()) as DetailsPayload;
        if (!response.ok || !payload.details) {
          return;
        }
        const release =
          payload.release || buildFallbackRelease(payload.details as Details, item.mediaType);
        if (!release) {
          return;
        }
        addRelease(release, {
          tmdbId: item.id,
          mediaType: item.mediaType,
          details: payload.details,
        });
      } catch {
        // ignore network failures for now
      }
    },
    [addRelease, backendURL, isSuggestionSaved]
  );

  const filteredResults = useMemo(() => {
    if (filter === 'all') {
      return results;
    }
    return results.filter((item) => item.mediaType === filter);
  }, [filter, results]);

  return {
    query,
    setQuery,
    filter,
    setFilter,
    filteredResults,
    isLoading,
    page,
    totalPages,
    loadResults,
    handleAdd,
    isSuggestionSaved,
  };
}
