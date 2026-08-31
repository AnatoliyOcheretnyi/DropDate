"use client";

import { requestApi } from "../../../shared/api/http";
import type { ListProgress } from "../../../shared/lib/achievements";
import type { PersonFollow } from "../../../shared/lib/release";
import type {
  FriendUser,
  Friendship,
  RelationshipStatus,
} from "../../../shared/types/friends";
import type { SavedRelease } from "../../../shared/types/releases";

const authHeader = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export type FriendSearchResult = { user: FriendUser; status: RelationshipStatus };

export async function searchFriends(
  accessToken: string,
  query: string,
  signal?: AbortSignal
): Promise<FriendSearchResult[]> {
  const response = await requestApi<{ results?: FriendSearchResult[] }>({
    url: "/api/friends/search",
    method: "GET",
    params: { query },
    headers: authHeader(accessToken),
    signal,
  });

  if (!response.ok) {
    throw new Error("Не вдалося виконати пошук");
  }
  return Array.isArray(response.payload?.results) ? response.payload.results : [];
}

export async function sendFriendRequest(
  accessToken: string,
  query: string
): Promise<Friendship> {
  const response = await requestApi<Friendship>({
    url: "/api/friends/requests",
    method: "POST",
    data: { query },
    headers: { ...authHeader(accessToken), "Content-Type": "application/json" },
  });

  if (!response.ok || !response.payload) {
    throw new Error("Не вдалося надіслати запит у друзі");
  }
  return response.payload;
}

export async function respondFriendRequest(
  accessToken: string,
  friendshipId: string,
  accept: boolean
): Promise<void> {
  const response = await requestApi({
    url: "/api/friends/requests/respond",
    method: "POST",
    data: { friendshipId, accept },
    headers: { ...authHeader(accessToken), "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error("Не вдалося відповісти на запит");
  }
}

export async function fetchFriends(
  accessToken: string,
  signal?: AbortSignal
): Promise<{ friends: Friendship[]; incoming: Friendship[]; outgoing: Friendship[] }> {
  const response = await requestApi<{
    friends?: Friendship[];
    incoming?: Friendship[];
    outgoing?: Friendship[];
  }>({
    url: "/api/friends",
    method: "GET",
    headers: authHeader(accessToken),
    signal,
  });

  if (!response.ok) {
    throw new Error("Не вдалося завантажити друзів");
  }
  return {
    friends: response.payload?.friends ?? [],
    incoming: response.payload?.incoming ?? [],
    outgoing: response.payload?.outgoing ?? [],
  };
}

export async function removeFriendship(
  accessToken: string,
  friendshipId: string
): Promise<void> {
  const response = await requestApi({
    url: "/api/friends",
    method: "DELETE",
    params: { friendshipId },
    headers: authHeader(accessToken),
  });

  if (!response.ok) {
    throw new Error("Не вдалося видалити друга");
  }
}

export async function fetchFriendSaved(
  accessToken: string,
  friendId: string,
  listType: string | undefined,
  signal?: AbortSignal
): Promise<SavedRelease[]> {
  const response = await requestApi<{ items?: SavedRelease[] }>({
    url: "/api/friends/saved",
    method: "GET",
    params: { friendId, ...(listType ? { listType } : {}) },
    headers: authHeader(accessToken),
    signal,
  });

  if (!response.ok) {
    throw new Error("Не вдалося завантажити списки друга");
  }
  return Array.isArray(response.payload?.items) ? response.payload.items : [];
}

export async function fetchFriendAchievements(
  accessToken: string,
  friendId: string,
  signal?: AbortSignal
): Promise<ListProgress[]> {
  const response = await requestApi<{ lists?: ListProgress[] }>({
    url: "/api/friends/achievements",
    method: "GET",
    params: { friendId },
    headers: authHeader(accessToken),
    signal,
  });

  if (!response.ok) {
    throw new Error("Не вдалося завантажити нагороди друга");
  }
  return Array.isArray(response.payload?.lists) ? response.payload.lists : [];
}

export async function fetchFriendFollows(
  accessToken: string,
  friendId: string,
  signal?: AbortSignal
): Promise<PersonFollow[]> {
  const response = await requestApi<{ items?: PersonFollow[] }>({
    url: "/api/friends/follows",
    method: "GET",
    params: { friendId },
    headers: authHeader(accessToken),
    signal,
  });

  if (!response.ok) {
    throw new Error("Не вдалося завантажити людей друга");
  }
  return Array.isArray(response.payload?.items) ? response.payload.items : [];
}
