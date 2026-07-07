"use client";

import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useFollowedPeopleStore } from "../store/followedPeopleStore";

export function useFollowedPeople() {
  const { people, isReady, hydrate, toggle, remove } = useFollowedPeopleStore(
    useShallow((state) => ({
      people: state.people,
      isReady: state.isReady,
      hydrate: state.hydrate,
      toggle: state.toggle,
      remove: state.remove,
    }))
  );

  useEffect(() => {
    if (!isReady) {
      hydrate();
    }
  }, [isReady, hydrate]);

  const isFollowing = (tmdbId: number) =>
    people.some((person) => person.tmdbId === tmdbId);

  return { people, isReady, isFollowing, toggle, remove };
}
