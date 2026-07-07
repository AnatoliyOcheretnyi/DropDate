"use client";

import { create } from "zustand";

export type PersonRole = "actor" | "director";

export type FollowedPerson = {
  tmdbId: number;
  name: string;
  role: PersonRole;
  profileUrl?: string;
  followedAt: number;
};

const STORAGE_KEY = "dropdate:followed-people";

const readFromStorage = (): FollowedPerson[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FollowedPerson[]) : [];
  } catch {
    return [];
  }
};

const writeToStorage = (items: FollowedPerson[]) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage issues
  }
};

type FollowedPeopleStore = {
  people: FollowedPerson[];
  isReady: boolean;
  hydrate: () => void;
  toggle: (person: Omit<FollowedPerson, "followedAt">) => void;
  remove: (tmdbId: number) => void;
};

export const useFollowedPeopleStore = create<FollowedPeopleStore>((set) => ({
  people: [],
  isReady: false,
  hydrate: () => set({ people: readFromStorage(), isReady: true }),
  toggle: (person) =>
    set((state) => {
      const exists = state.people.some((p) => p.tmdbId === person.tmdbId);
      const next = exists
        ? state.people.filter((p) => p.tmdbId !== person.tmdbId)
        : [...state.people, { ...person, followedAt: Date.now() }];
      writeToStorage(next);
      return { people: next };
    }),
  remove: (tmdbId) =>
    set((state) => {
      const next = state.people.filter((p) => p.tmdbId !== tmdbId);
      writeToStorage(next);
      return { people: next };
    }),
}));
