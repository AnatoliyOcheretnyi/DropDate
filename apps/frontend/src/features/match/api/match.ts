export type MatchOption = {
  id: string;
  label: string;
  emoji?: string;
};

export type MatchQuestion = {
  id: string;
  title: string;
  type: string;
  appliesTo: "both" | "movie" | "tv";
  options: MatchOption[];
};

export type MatchPick = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year?: string;
  posterUrl?: string;
  rating?: number;
  reason?: string;
};

type QuestionsResponse = { items: MatchQuestion[] };
type PicksResponse = { items: MatchPick[] };

export const pickKey = (pick: { mediaType: string; tmdbId: number }) =>
  `${pick.mediaType}:${pick.tmdbId}`;

export async function fetchMatchQuestions(
  signal?: AbortSignal
): Promise<MatchQuestion[]> {
  const response = await fetch(`/api/match/questions`, {
    headers: { accept: "application/json" },
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error("Не вдалося завантажити питання");
  }
  const payload = (await response.json().catch(() => null)) as
    | QuestionsResponse
    | null;
  return Array.isArray(payload?.items) ? payload!.items : [];
}

export type MatchPicksRequest = {
  answers: Record<string, string>;
  count?: number;
  excludeKeys?: string[];
};

export async function fetchMatchPicks(
  request: MatchPicksRequest,
  accessToken?: string | null,
  signal?: AbortSignal
): Promise<MatchPick[]> {
  const response = await fetch(`/api/match/picks`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(request),
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;
    throw new Error(
      payload?.error || payload?.message || "Не вдалося підібрати"
    );
  }
  const payload = (await response.json().catch(() => null)) as
    | PicksResponse
    | null;
  return Array.isArray(payload?.items) ? payload!.items : [];
}
