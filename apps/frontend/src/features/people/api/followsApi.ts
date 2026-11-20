"use client";

import { webApi } from "../../../shared/api/http";
import { AuthError, fetchWithAuth } from "../../../shared/state/auth";
import type { PersonFollow, PersonRole } from "../../../shared/lib/release";

export class FollowsLoadError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "FollowsLoadError";
  }
}

export function canRetryFollows(error: unknown) {
  return (
    !(error instanceof FollowsLoadError) ||
    error.status === undefined ||
    error.status >= 500 ||
    error.status === 408 ||
    error.status === 429
  );
}

export async function fetchFollows(
  userId: string,
  signal?: AbortSignal,
): Promise<PersonFollow[]> {
  try {
    const response = await fetchWithAuth(
      "/api/people/follows",
      { signal },
      userId,
    );
    if (!response.ok) {
      throw new FollowsLoadError(
        response.status === 401 || response.status === 403
          ? "Увійди знову, щоб завантажити своїх людей."
          : "Не вдалося завантажити список людей. Спробуємо ще раз автоматично.",
        response.status,
      );
    }
    const payload = await response.json();
    if (!Array.isArray(payload?.items)) {
      throw new FollowsLoadError(
        "Сервер не повернув список людей. Спробуємо ще раз автоматично.",
        502,
      );
    }
    return payload.items;
  } catch (error) {
    if (signal?.aborted || error instanceof FollowsLoadError) throw error;
    if (error instanceof AuthError) {
      throw new FollowsLoadError(
        "Увійди знову, щоб завантажити своїх людей.",
        error.status ?? 401,
      );
    }
    throw new FollowsLoadError(
      "Не вдалося з’єднатися із сервером. Список людей оновиться автоматично після відновлення зв’язку.",
    );
  }
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
  },
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
  role: PersonRole,
) {
  const params = new URLSearchParams();
  params.set("personId", String(personId));
  params.set("role", role);
  await webApi.delete(`/api/people/follows?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
