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
    queryKey: ["friend-search", debouncedQuery],
    enabled: isAuthed && isEligible,
    queryFn: ({ signal }) => searchFriends(accessToken!, debouncedQuery, signal),
    staleTime: 1000 * 10,
  });

  return {
    query,
    setQuery,
    results: isEligible ? search.data ?? [] : [],
    isSearching: isEligible && search.isFetching,
    hasSearched: isEligible && !search.isFetching,
    minQueryLength: MIN_QUERY_LENGTH,
  };
}
