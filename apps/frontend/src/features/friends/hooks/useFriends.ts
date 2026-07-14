"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { useAuth } from "../../../shared/state/auth";
import {
  fetchFriends,
  removeFriendship,
  respondFriendRequest,
  sendFriendRequest,
} from "../api/friendsApi";

export function useFriends() {
  const { user, accessToken } = useAuth();
  const isAuthed = Boolean(user && accessToken);
  const queryClient = useQueryClient();
  const queryKey = webQueryKeys.friends(user?.id ?? "guest");

  const query = useQuery({
    queryKey,
    enabled: isAuthed,
    queryFn: ({ signal }) => fetchFriends(accessToken!, signal),
    staleTime: 1000 * 30,
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey }),
    [queryClient, queryKey]
  );

  const sendRequest = useMutation({
    mutationFn: (query: string) => sendFriendRequest(accessToken!, query),
    onSuccess: invalidate,
  });

  const respond = useMutation({
    mutationFn: ({ friendshipId, accept }: { friendshipId: string; accept: boolean }) =>
      respondFriendRequest(accessToken!, friendshipId, accept),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (friendshipId: string) => removeFriendship(accessToken!, friendshipId),
    onSuccess: invalidate,
  });

  return {
    friends: query.data?.friends ?? [],
    incoming: query.data?.incoming ?? [],
    outgoing: query.data?.outgoing ?? [],
    isLoading: query.isLoading,
    sendRequest: sendRequest.mutateAsync,
    isSending: sendRequest.isPending,
    respond: respond.mutateAsync,
    remove: remove.mutateAsync,
  };
}
