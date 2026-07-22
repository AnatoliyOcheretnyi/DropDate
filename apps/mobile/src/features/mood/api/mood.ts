import { apiRequest } from "../../../shared/api/client";
export type MoodQuestion = {
  id: string;
  title: string;
  options: { id: string; label: string; emoji?: string }[];
};
export type MoodPick = {
  tmdbId: number;
  mediaType: "movie";
  title: string;
  year?: string;
  reason?: string;
};
export const getMoodQuestions = async (signal?: AbortSignal) =>
  (
    await apiRequest<{ items: MoodQuestion[] }>(
      "/mood/questions?depth=standard",
      { signal },
    )
  ).items ?? [];
export type MoodNext = {
  question?: MoodQuestion;
  done: boolean;
  answered: number;
};
export type MoodResult = { items: MoodPick[]; meta: { relaxed?: string[] } };
export const getMoodNext = (depth: string, answers: Record<string, string>) =>
  apiRequest<MoodNext>("/mood/next", {
    method: "POST",
    auth: true,
    body: { depth, answers },
  });
export const getMoodPicks = (
  answers: Record<string, string>,
  excludeTmdbIds: number[] = [],
  depth = "standard",
) =>
  apiRequest<MoodResult>("/mood/picks", {
    method: "POST",
    auth: true,
    body: { mode: "guided", depth, answers, count: 6, excludeTmdbIds },
  });
