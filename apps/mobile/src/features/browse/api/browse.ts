import { apiRequest } from "../../../shared/api/client";
import type { Suggestion } from "../../../shared/types/release";

export type DiscoverPage = {
  results: Suggestion[];
  page: number;
  hasMore: boolean;
};

export function discover(
  params: { genres: string[]; countries: string[]; page: number },
  signal?: AbortSignal,
) {
  const search = new URLSearchParams();
  if (params.genres.length) search.set("genres", params.genres.join(","));
  if (params.countries.length)
    search.set("countries", params.countries.join(","));
  search.set("page", String(params.page));
  return apiRequest<DiscoverPage>(`/discover?${search.toString()}`, { signal });
}
