export type MoodOption = {
  id: string;
  label: string;
  emoji?: string;
};

export type MoodQuestion = {
  id: string;
  title: string;
  type: string;
  options: MoodOption[];
};

export type MoodQuestionsResponse = {
  items: MoodQuestion[];
  meta: { depth: string; version: number };
};

export type MoodNextResponse = {
  question?: MoodQuestion;
  done: boolean;
  answered: number;
  meta: { depth: string; version: number };
};

export type MoodPick = {
  tmdbId: number;
  mediaType: "movie";
  title: string;
  year?: string;
  posterUrl?: string;
  rating?: number;
  reason?: string;
};

export type MoodPicksResponse = {
  items: MoodPick[];
  meta: { count: number; relaxed: string[]; generatedAt: string };
};

export type MoodPicksRequest = {
  depth: string;
  answers: Record<string, string>;
  count?: number;
  excludeTmdbIds?: number[];
};

/** fetchMoodQuestions loads the question schema for a depth via the proxy. */
export async function fetchMoodQuestions(
  depth: string,
  signal?: AbortSignal
): Promise<MoodQuestion[]> {
  const params = new URLSearchParams({ depth });
  const response = await fetch(`/api/mood/questions?${params.toString()}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error("Не вдалося завантажити питання");
  }
  const payload = (await response.json().catch(() => null)) as
    | MoodQuestionsResponse
    | null;
  return Array.isArray(payload?.items) ? payload!.items : [];
}

/** fetchMoodNext asks the backend for the next adaptive question (or done). */
export async function fetchMoodNext(
  depth: string,
  answers: Record<string, string>,
  accessToken?: string | null,
  signal?: AbortSignal
): Promise<MoodNextResponse> {
  const response = await fetch(`/api/mood/next`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ depth, answers }),
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error("Не вдалося завантажити наступне питання");
  }
  const payload = (await response.json().catch(() => null)) as
    | MoodNextResponse
    | null;
  return payload ?? { done: true, answered: 0, meta: { depth, version: 0 } };
}

/** fetchMoodPicks resolves answers into movie picks. */
export async function fetchMoodPicks(
  request: MoodPicksRequest,
  accessToken?: string | null,
  signal?: AbortSignal
): Promise<MoodPicksResponse> {
  const response = await fetch(`/api/mood/picks`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ mode: "guided", ...request }),
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;
    throw new Error(
      payload?.error || payload?.message || "Не вдалося підібрати фільми"
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | MoodPicksResponse
    | null;
  return (
    payload ?? { items: [], meta: { count: 0, relaxed: [], generatedAt: "" } }
  );
}
