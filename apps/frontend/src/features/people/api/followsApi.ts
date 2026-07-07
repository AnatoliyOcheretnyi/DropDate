"use client";

import { requestApi, webApi } from "../../../shared/api/http";
import type { PersonFollow, PersonRole } from "../../../shared/lib/release";

export async function fetchFollows(
  accessToken: string,
  signal?: AbortSignal
): Promise<PersonFollow[]> {
  const response = await requestApi<{ items?: PersonFollow[] }>({
    url: "/api/people/follows",
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });
  return Array.isArray(response.payload?.items) ? response.payload.items : [];
}

export async function upsertFollow(
  accessToken: string,
  payload: {
    personId: number;
    role: PersonRole;
    name: string;
    profileUrl?: string;
    knownFor?: string;
    liked: boolean;
    subscribed: boolean;
  }
) {
  await webApi.post("/api/people/follows", payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function deleteFollow(
  accessToken: string,
  personId: number,
  role: PersonRole
) {
  const params = new URLSearchParams();
  params.set("personId", String(personId));
  params.set("role", role);
  await webApi.delete(`/api/people/follows?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
