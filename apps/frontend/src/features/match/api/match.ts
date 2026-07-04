import { requestApi } from "../../../shared/api/http";

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
  const response = await requestApi<QuestionsResponse>({
    url: "/api/match/questions",
    method: "GET",
    signal,
  });
  if (!response.ok || !response.payload) {
    throw new Error("Не вдалося завантажити питання");
  }
  return Array.isArray(response.payload.items) ? response.payload.items : [];
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
  const response = await requestApi<PicksResponse & { error?: string; message?: string }>({
    url: "/api/match/picks",
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    data: request,
    signal,
  });

  if (!response.ok || !response.payload) {
    throw new Error(
      response.payload?.error || response.payload?.message || "Не вдалося підібрати"
    );
  }
  return Array.isArray(response.payload.items) ? response.payload.items : [];
}
