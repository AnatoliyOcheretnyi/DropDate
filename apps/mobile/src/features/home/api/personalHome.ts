import { apiRequest } from "../../../shared/api/client";

export type DailyPickState = {
  date: string;
  revealed: boolean;
  action: "none" | "saved" | "disliked";
  pick?: {
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    year?: string;
    posterUrl?: string;
    reason?: { text?: string };
  };
};
export type ContinueItem = {
  tmdbId: number;
  title: string;
  posterUrl?: string;
  seasonNumber: number;
  episodeNumber: number;
};
export const getDailyPick = (signal?: AbortSignal) =>
  apiRequest<DailyPickState>("/recommendations/daily", { auth: true, signal });
export const updateDailyPick = (
  state: Pick<DailyPickState, "date" | "revealed" | "action">,
) =>
  apiRequest<DailyPickState>("/recommendations/daily", {
    method: "POST",
    auth: true,
    body: state,
  });
export async function getContinueWatching(signal?: AbortSignal) {
  const value = await apiRequest<{ items?: ContinueItem[] }>(
    "/episodes/continue",
    { auth: true, signal },
  );
  return value.items ?? [];
}
