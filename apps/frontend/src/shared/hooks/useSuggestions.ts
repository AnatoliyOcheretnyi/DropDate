"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { requestApi } from "../api/http";
import { webQueryKeys } from "../api/queryKeys";
import type { Suggestion } from "../lib/release";
import type { PersonMatch } from "../../features/search/types";
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
      const response = await requestApi<{
        results?: Suggestion[];
        people?: PersonMatch[];
      }>({
        url: "/api/suggest",
        method: "GET",
        params: { query: debouncedTitle },
        signal,
      });
      if (!response.ok) {
        return { results: [], people: [] };
      }
      return {
        results: Array.isArray(response.payload?.results)
          ? response.payload.results
          : [],
        people: Array.isArray(response.payload?.people)
          ? response.payload.people
          : [],
      };
    },
    staleTime: 1000 * 30,
  });

  const isActive = debouncedTitle.length >= 2 && !selectedMatchesInput;

  return {
    suggestions: isActive ? suggestionsQuery.data?.results ?? [] : [],
    // People matched by name — the same request already carries them, so an
    // actor typed into any search box costs no extra round trip.
    people: isActive ? suggestionsQuery.data?.people ?? [] : [],
    isFetching: suggestionsQuery.isFetching,
  };
}
