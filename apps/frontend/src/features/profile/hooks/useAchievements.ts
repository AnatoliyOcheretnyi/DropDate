"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { useAuth } from "../../../shared/state/auth";
import { subscribeUnlocks } from "../../../shared/lib/achievementBus";
import { fetchAchievements } from "../api/achievementsApi";

export function useAchievements() {
  const { user, accessToken } = useAuth();
  const queryClient = useQueryClient();
  const isAuthed = Boolean(user && accessToken);

  const query = useQuery({
    queryKey: webQueryKeys.achievements(user?.id ?? "guest"),
    enabled: isAuthed,
    queryFn: ({ signal }) => fetchAchievements(accessToken!, signal),
    staleTime: 1000 * 30,
  });

  // A save action elsewhere in the app may have just unlocked a tier — refetch
  // so the profile reflects it without the user having to reload the page.
  useEffect(() => {
    if (!user?.id) {
      return;
    }
    return subscribeUnlocks(() => {
      void queryClient.invalidateQueries({
        queryKey: webQueryKeys.achievements(user.id),
      });
    });
  }, [queryClient, user?.id]);

  return {
    lists: query.data ?? [],
    isLoading: query.isLoading,
  };
}
