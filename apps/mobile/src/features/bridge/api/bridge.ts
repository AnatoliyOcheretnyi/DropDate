import { apiRequest } from "../../../shared/api/client";
export type BridgeItem = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year?: string;
  posterUrl?: string;
  rating?: number;
  country: string;
  countryCode: string;
  reason: string;
};
export const getBridge = (
  mediaType: "movie" | "tv",
  adventure: number,
  runtimeLTE: number,
  signal?: AbortSignal,
) =>
  apiRequest<{ items: BridgeItem[] }>(
    `/bridge?mediaType=${mediaType}&adventure=${adventure}&runtimeLTE=${runtimeLTE}`,
    { auth: true, signal },
  );
