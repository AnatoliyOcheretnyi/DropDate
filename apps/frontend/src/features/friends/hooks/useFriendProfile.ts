"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { useAuth } from "../../../shared/state/auth";
import { normalizeSavedRelease } from "../../saved/utils/savedState";
import {
  fetchFriendAchievements,
  fetchFriendFollows,
  fetchFriendSaved,
} from "../api/friendsApi";
import { useFriends } from "./useFriends";

export function useFriendProfile(friendId: string) {
  const { user, accessToken } = useAuth();
  const isAuthed = Boolean(user && accessToken);
  const { friends, isLoading: friendsLoading } = useFriends();

  const friendship = useMemo(
    () => friends.find((entry) => entry.user.id === friendId),
    [friends, friendId]
  );

  const savedQuery = useQuery({
    queryKey: webQueryKeys.friendSaved(friendId, ""),
    enabled: isAuthed && Boolean(friendId),
    queryFn: ({ signal }) => fetchFriendSaved(accessToken!, friendId, undefined, signal),
    staleTime: 1000 * 30,
  });

  const achievementsQuery = useQuery({
    queryKey: webQueryKeys.friendAchievements(friendId),
    enabled: isAuthed && Boolean(friendId),
    queryFn: ({ signal }) => fetchFriendAchievements(accessToken!, friendId, signal),
    staleTime: 1000 * 30,
  });

  const followsQuery = useQuery({
    queryKey: webQueryKeys.friendFollows(friendId),
    enabled: isAuthed && Boolean(friendId),
    queryFn: ({ signal }) => fetchFriendFollows(accessToken!, friendId, signal),
    staleTime: 1000 * 60,
  });

  const saved = useMemo(
    () => (savedQuery.data ?? []).map((item) => normalizeSavedRelease(item)),
    [savedQuery.data]
  );

  return {
    friendship,
    isResolvingFriendship: friendsLoading,
    saved,
    isSavedLoading: savedQuery.isLoading,
    savedError: savedQuery.error,
    achievements: achievementsQuery.data ?? [],
    isAchievementsLoading: achievementsQuery.isLoading,
    follows: followsQuery.data ?? [],
    isFollowsLoading: followsQuery.isLoading,
  };
}
