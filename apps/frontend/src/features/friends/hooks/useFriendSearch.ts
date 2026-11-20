"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../shared/state/auth";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";
import { searchFriends } from "../api/friendsApi";

const MIN_QUERY_LENGTH = 3;

export function useFriendSearch() {
  const { user, accessToken } = useAuth();
  const isAuthed = Boolean(user && accessToken);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 350);
  const isEligible = debouncedQuery.length >= MIN_QUERY_LENGTH;

  const search = useQuery({
    queryKey: ["friend-search", user?.id, debouncedQuery],
    enabled: isAuthed && isEligible,
    queryFn: ({ signal }) =>
      searchFriends(accessToken!, debouncedQuery, signal),
    staleTime: 1000 * 10,
  });

  return {
    query,
    setQuery,
    results:
      isEligible && query.trim() === debouncedQuery ? (search.data ?? []) : [],
    isSearching:
      query.trim().length >= MIN_QUERY_LENGTH &&
      (query.trim() !== debouncedQuery || search.isFetching),
    hasSearched:
      isEligible && query.trim() === debouncedQuery && search.isSuccess,
    error: query.trim() === debouncedQuery ? search.error?.message : undefined,
    minQueryLength: MIN_QUERY_LENGTH,
  };
}
