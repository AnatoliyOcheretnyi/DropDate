import { apiRequest } from "../../../shared/api/client";
export type RecommendationItem = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year?: string;
  posterUrl?: string;
  reason: { seedCount: number; primarySource: string; text?: string };
};
export type RecommendationsResponse = {
  items: RecommendationItem[];
  meta: { seedCount: number; generatedAt: string };
};
export const getRecommendations = (signal?: AbortSignal) =>
  apiRequest<RecommendationsResponse>("/recommendations/me?limit=18&ai=1", {
    auth: true,
    signal,
  });
export type SimilarItem = {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  year?: string;
  posterUrl?: string;
};
export async function getSimilar(
  tmdbId: number,
  mediaType: "movie" | "tv",
  signal?: AbortSignal,
) {
  const value = await apiRequest<{ items?: SimilarItem[] }>(
    `/recommendations/similar?tmdbId=${tmdbId}&mediaType=${mediaType}`,
    { signal },
  );
  return value.items ?? [];
}
