export type SearchFilter = "all" | "movie" | "tv";

export type SearchPayload = {
  results: import("../../../lib/release").Suggestion[];
  page: number;
  totalPages: number;
  totalResults: number;
};
