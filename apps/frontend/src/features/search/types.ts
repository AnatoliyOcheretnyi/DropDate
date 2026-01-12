export type SearchFilter = "all" | "movie" | "tv";

import type { Suggestion } from "../../shared/lib/release";

export type SearchPayload = {
  results: Suggestion[];
  page: number;
  totalPages: number;
  totalResults: number;
};
