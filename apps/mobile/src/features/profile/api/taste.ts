import { apiRequest } from "../../../shared/api/client";
export type TasteKind = "genre" | "country";
export type TasteItem = {
  id: string;
  score: number;
  comparisons: number;
  confidence: number;
};
export type TastePair = {
  kind: TasteKind;
  left: string;
  right: string;
  round: number;
};
export type TasteStatus = {
  stage: "genre" | "country" | "titles" | "completed";
  completed: boolean;
  genreComparisons: number;
  countryComparisons: number;
  titleFeedbackCount: number;
  targetComparisons: number;
  targetTitleFeedback: number;
  titles?: {
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    posterUrl?: string;
    year?: string;
  }[];
};
export const getTaste = async (kind: TasteKind, signal?: AbortSignal) => {
  const r = await apiRequest<{ items?: TasteItem[] }>(`/taste?kind=${kind}`, {
    auth: true,
    signal,
  });
  return r.items ?? [];
};
export const getTastePair = (kind: TasteKind, signal?: AbortSignal) =>
  apiRequest<TastePair>(`/taste/next?kind=${kind}`, { auth: true, signal });
export const compareTaste = (
  kind: TasteKind,
  pair: TastePair,
  winner: "left" | "right" | "tie",
) =>
  apiRequest<TastePair>(`/taste?kind=${kind}`, {
    method: "POST",
    auth: true,
    body: { left: pair.left, right: pair.right, winner },
  });
export const getTasteStatus = (signal?: AbortSignal) =>
  apiRequest<TasteStatus>("/taste/onboarding", { auth: true, signal });
export const updateTasteStatus = (body: Record<string, unknown>) =>
  apiRequest<TasteStatus>("/taste/onboarding", {
    method: "POST",
    auth: true,
    body,
  });
