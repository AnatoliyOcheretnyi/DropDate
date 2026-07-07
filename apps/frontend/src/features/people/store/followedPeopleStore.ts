"use client";

import { create } from "zustand";

export type PersonRole = "actor" | "director";

export type FollowedPerson = {
  tmdbId: number;
  name: string;
  role: PersonRole;
  profileUrl?: string;
  knownFor?: string;
  subscribed?: boolean;
  followedAt: number;
};

const STORAGE_KEY = "dropdate:followed-people";

const followKey = (tmdbId: number, role: PersonRole) => `${tmdbId}:${role}`;

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
  /** Replace the whole list, e.g. after loading from the backend. */
  setPeople: (people: FollowedPerson[]) => void;
  /** Insert or update a single (person, role) follow. */
  upsert: (person: Omit<FollowedPerson, "followedAt">) => void;
  /** Remove a follow scoped to a single role. */
  removeByRole: (tmdbId: number, role: PersonRole) => void;
  /** Legacy: toggle a follow keyed by (tmdbId, role). */
  toggle: (person: Omit<FollowedPerson, "followedAt">) => void;
  /** Legacy: remove every follow for a person, across roles. */
  remove: (tmdbId: number) => void;
};

export const useFollowedPeopleStore = create<FollowedPeopleStore>((set) => ({
  people: [],
  isReady: false,
  hydrate: () => set({ people: readFromStorage(), isReady: true }),
  setPeople: (people) => {
    writeToStorage(people);
    set({ people, isReady: true });
  },
  upsert: (person) =>
    set((state) => {
      const key = followKey(person.tmdbId, person.role);
      const existing = state.people.find(
        (p) => followKey(p.tmdbId, p.role) === key
      );
      const next = existing
        ? state.people.map((p) =>
            followKey(p.tmdbId, p.role) === key ? { ...p, ...person } : p
          )
        : [...state.people, { ...person, followedAt: Date.now() }];
      writeToStorage(next);
      return { people: next };
    }),
  removeByRole: (tmdbId, role) =>
    set((state) => {
      const key = followKey(tmdbId, role);
      const next = state.people.filter(
        (p) => followKey(p.tmdbId, p.role) !== key
      );
      writeToStorage(next);
      return { people: next };
    }),
  toggle: (person) =>
    set((state) => {
      const key = followKey(person.tmdbId, person.role);
      const exists = state.people.some(
        (p) => followKey(p.tmdbId, p.role) === key
      );
      const next = exists
        ? state.people.filter((p) => followKey(p.tmdbId, p.role) !== key)
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
