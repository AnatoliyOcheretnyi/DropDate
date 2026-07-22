import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../../shared/api/queryKeys";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";
import {
  getFriends,
  removeFriendship,
  respondFriendRequest,
  searchFriends,
  sendFriendRequest,
} from "../api/friends";

export type FriendsTab = "friends" | "incoming" | "outgoing";

export function useFriendsScreen() {
  const client = useQueryClient();
  const [tab, setTab] = useState<FriendsTab>("friends");
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), 350);
  const friends = useQuery({
    queryKey: queryKeys.friends,
    queryFn: ({ signal }) => getFriends(signal),
    staleTime: 30_000,
  });
  const results = useQuery({
    queryKey: queryKeys.friendSearch(debounced),
    queryFn: ({ signal }) => searchFriends(debounced, signal),
    enabled: debounced.length >= 3,
    staleTime: 10_000,
  });
  const refresh = () =>
    client.invalidateQueries({ queryKey: queryKeys.friends });
  const send = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: async () => {
      setSearch("");
      await refresh();
    },
  });
  const respond = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      respondFriendRequest(id, accept),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: removeFriendship,
    onSuccess: refresh,
  });

  useEffect(() => {
    if (
      (friends.data?.incoming.length ?? 0) > 0 &&
      (friends.data?.friends.length ?? 0) === 0
    )
      setTab("incoming");
  }, [friends.data]);

  return {
    tab,
    setTab,
    search,
    setSearch,
    friends,
    results,
    send,
    respond,
    remove,
  };
}
