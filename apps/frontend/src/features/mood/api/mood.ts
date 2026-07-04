import { requestApi } from "../../../shared/api/http";

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
  const response = await requestApi<MoodQuestionsResponse>({
    url: "/api/mood/questions",
    method: "GET",
    params: { depth },
    signal,
  });
  if (!response.ok || !response.payload) {
    throw new Error("Не вдалося завантажити питання");
  }
  return Array.isArray(response.payload.items) ? response.payload.items : [];
}

/** fetchMoodNext asks the backend for the next adaptive question (or done). */
export async function fetchMoodNext(
  depth: string,
  answers: Record<string, string>,
  accessToken?: string | null,
  signal?: AbortSignal
): Promise<MoodNextResponse> {
  const response = await requestApi<MoodNextResponse>({
    url: "/api/mood/next",
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    data: { depth, answers },
    signal,
  });
  if (!response.ok) {
    throw new Error("Не вдалося завантажити наступне питання");
  }
  return response.payload ?? {
    done: true,
    answered: 0,
    meta: { depth, version: 0 },
  };
}

/** fetchMoodPicks resolves answers into movie picks. */
export async function fetchMoodPicks(
  request: MoodPicksRequest,
  accessToken?: string | null,
  signal?: AbortSignal
): Promise<MoodPicksResponse> {
  const response = await requestApi<
    MoodPicksResponse & { error?: string; message?: string }
  >({
    url: "/api/mood/picks",
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    data: { mode: "guided", ...request },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      response.payload?.error ||
        response.payload?.message ||
        "Не вдалося підібрати фільми"
    );
  }

  return (
    response.payload ?? {
      items: [],
      meta: { count: 0, relaxed: [], generatedAt: "" },
    }
  );
}
