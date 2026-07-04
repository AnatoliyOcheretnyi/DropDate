"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { requestApi } from "../api/http";
import { webQueryKeys } from "../api/queryKeys";
import type { Suggestion } from "../lib/release";
import { useDebouncedValue } from "./useDebouncedValue";

export function useSuggestions(
  title: string,
  selected: Suggestion | null,
  onClearSelection: () => void
) {
  const trimmedTitle = title.trim();
  const debouncedTitle = useDebouncedValue(trimmedTitle, 250);
  const selectedMatchesInput = Boolean(
    selected && selected.title.toLowerCase() === trimmedTitle.toLowerCase()
  );

  useEffect(() => {
    if (!trimmedTitle || trimmedTitle.length < 2) {
      if (selected) {
        onClearSelection();
      }
      return;
    }

    if (selected) {
      if (selected.title.toLowerCase() === trimmedTitle.toLowerCase()) {
        return;
      }
      onClearSelection();
    }
  }, [onClearSelection, selected, trimmedTitle]);

  const suggestionsQuery = useQuery({
    queryKey: webQueryKeys.suggestions(debouncedTitle),
    enabled:
      debouncedTitle.length >= 2 &&
      !(selected && selected.title.toLowerCase() === debouncedTitle.toLowerCase()),
    queryFn: async ({ signal }) => {
      const response = await requestApi<{ results?: Suggestion[] }>({
        url: "/api/suggest",
        method: "GET",
        params: { query: debouncedTitle },
        signal,
      });
      if (!response.ok) {
        return [];
      }
      return Array.isArray(response.payload?.results) ? response.payload.results : [];
    },
    staleTime: 1000 * 30,
  });

  return {
    suggestions:
      debouncedTitle.length >= 2 && !selectedMatchesInput
        ? suggestionsQuery.data ?? []
        : [],
    isFetching: suggestionsQuery.isFetching,
  };
}
