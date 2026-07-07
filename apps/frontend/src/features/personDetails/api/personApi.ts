"use client";

import { requestApi } from "../../../shared/api/http";
import type { Person, PersonPick, PersonRole } from "../../../shared/lib/release";

type PersonResponse = { person: Person };
type PersonPickResponse = { pick: PersonPick | null };

export async function fetchPerson(
  id: number,
  signal?: AbortSignal
): Promise<Person | null> {
  const response = await requestApi<PersonResponse>({
    url: "/api/person",
    method: "GET",
    params: { id },
    signal,
  });
  return response.ok ? response.payload?.person ?? null : null;
}

export async function fetchPersonPick(
  id: number,
  role: PersonRole,
  accessToken: string,
  signal?: AbortSignal
): Promise<PersonPick | null> {
  const response = await requestApi<PersonPickResponse>({
    url: "/api/person/recommend",
    method: "GET",
    params: { id, role },
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });
  return response.ok ? response.payload?.pick ?? null : null;
}
