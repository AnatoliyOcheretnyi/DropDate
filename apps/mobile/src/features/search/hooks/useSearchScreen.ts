import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Details, ReleaseInfo, Suggestion } from '../../../shared/types/release';
import { apiRequest } from '../../../shared/api/client';
import { buildFallbackRelease } from '../../../shared/utils/release';
import { useSaved } from '../../saved/hooks/useSaved';
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
        const payload = await apiRequest<SearchPayload>(`/search?query=${encodeURIComponent(debouncedQuery)}&page=${nextPage}`);
        setResults((prev) => (append ? [...prev, ...payload.results] : payload.results));
        setPage(payload.page || nextPage);
        setTotalPages(payload.totalPages || 1);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedQuery]
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
        const payload = await apiRequest<DetailsPayload>(`/details?tmdbId=${item.id}&mediaType=${item.mediaType}`);
        if (!payload.details) {
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
    [addRelease, isSuggestionSaved]
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
