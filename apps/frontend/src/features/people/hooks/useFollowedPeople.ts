"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useQuery } from "@tanstack/react-query";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { useAuth } from "../../../shared/state/auth";
import type { PersonRole } from "../../../shared/lib/release";
import {
  useFollowedPeopleStore,
  type FollowedPerson,
} from "../store/followedPeopleStore";
import { deleteFollow, fetchFollows, upsertFollow } from "../api/followsApi";

export type FollowTarget = {
  tmdbId: number;
  name: string;
  role: PersonRole;
  profileUrl?: string;
  knownFor?: string;
};

const followKey = (tmdbId: number, role: PersonRole) => `${tmdbId}:${role}`;

export function useFollowedPeople() {
  const { user, accessToken } = useAuth();
  const isAuthed = Boolean(user && accessToken);

  const {
    people,
    isReady,
    hydrate,
    setPeople,
    upsert,
    removeByRole,
    toggle,
    remove,
  } = useFollowedPeopleStore(
    useShallow((state) => ({
      people: state.people,
      isReady: state.isReady,
      hydrate: state.hydrate,
      setPeople: state.setPeople,
      upsert: state.upsert,
      removeByRole: state.removeByRole,
      toggle: state.toggle,
      remove: state.remove,
    }))
  );

  useEffect(() => {
    if (!isReady) {
      hydrate();
    }
  }, [isReady, hydrate]);

  // When signed in, the backend is the source of truth for followed people.
  const followsQuery = useQuery({
    queryKey: webQueryKeys.personFollows(user?.id ?? "guest"),
    enabled: isAuthed,
    queryFn: async ({ signal }) => fetchFollows(accessToken!, signal),
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (!isAuthed || !followsQuery.data) {
      return;
    }
    const mapped: FollowedPerson[] = followsQuery.data.map((item) => ({
      tmdbId: item.personId,
      name: item.name,
      role: item.role,
      profileUrl: item.profileUrl,
      knownFor: item.knownFor,
      subscribed: item.subscribed,
      followedAt: Date.now(),
    }));
    setPeople(mapped);
  }, [followsQuery.data, isAuthed, setPeople]);

  const followByKey = useMemo(() => {
    const index = new Map<string, FollowedPerson>();
    people.forEach((person) => {
      index.set(followKey(person.tmdbId, person.role), person);
    });
    return index;
  }, [people]);

  const isFollowing = useCallback(
    (tmdbId: number) => people.some((person) => person.tmdbId === tmdbId),
    [people]
  );

  const getFollow = useCallback(
    (tmdbId: number, role: PersonRole) =>
      followByKey.get(followKey(tmdbId, role)),
    [followByKey]
  );

  // Liking is a toggle: turning it off removes the follow (and its
  // subscription). Turning it on creates a like-only follow.
  const toggleLike = useCallback(
    (target: FollowTarget) => {
      const existing = getFollow(target.tmdbId, target.role);
      if (existing) {
        removeByRole(target.tmdbId, target.role);
        if (isAuthed && accessToken) {
          void deleteFollow(accessToken, target.tmdbId, target.role);
        }
        return;
      }
      upsert({ ...target, subscribed: false });
      if (isAuthed && accessToken) {
        void upsertFollow(accessToken, {
          personId: target.tmdbId,
          role: target.role,
          name: target.name,
          profileUrl: target.profileUrl,
          knownFor: target.knownFor,
          liked: true,
          subscribed: false,
        });
      }
    },
    [accessToken, getFollow, isAuthed, removeByRole, upsert]
  );

  // Backend-aware removal for list views (Saved / Profile).
  const removeFollow = useCallback(
    (tmdbId: number, role: PersonRole) => {
      removeByRole(tmdbId, role);
      if (isAuthed && accessToken) {
        void deleteFollow(accessToken, tmdbId, role);
      }
    },
    [accessToken, isAuthed, removeByRole]
  );

  // Subscribing implies a like; unsubscribing keeps the like in place.
  const toggleSubscribe = useCallback(
    (target: FollowTarget) => {
      const existing = getFollow(target.tmdbId, target.role);
      const nextSubscribed = !existing?.subscribed;
      upsert({ ...target, subscribed: nextSubscribed });
      if (isAuthed && accessToken) {
        void upsertFollow(accessToken, {
          personId: target.tmdbId,
          role: target.role,
          name: target.name,
          profileUrl: target.profileUrl,
          knownFor: target.knownFor,
          liked: true,
          subscribed: nextSubscribed,
        });
      }
    },
    [accessToken, getFollow, isAuthed, upsert]
  );

  return {
    people,
    isReady,
    isFollowing,
    getFollow,
    toggleLike,
    toggleSubscribe,
    removeFollow,
    toggle,
    remove,
  };
}
