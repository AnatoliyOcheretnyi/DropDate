export type SearchFilter = "all" | "movie" | "tv";

import type { Suggestion } from "../../shared/lib/release";

/** A person matched by name, with the titles TMDB knows them for. */
export type PersonMatch = {
  id: number;
  name: string;
  profileUrl?: string;
  department?: string;
  /** TMDB gender: 1 female, 2 male, 0/3 unknown. Drives the wording of roles. */
  gender?: number;
  /** Derived from credits; only the person whose filmography was fetched has it. */
  roles?: string[];
  popularity?: number;
  knownFor?: Suggestion[];
};

export type SearchPayload = {
  results: Suggestion[];
  page: number;
  totalPages: number;
  totalResults: number;
  /** People whose name matches the query. Only the first page carries them. */
  people?: PersonMatch[];
  /** Whose filmography `personTitles` holds — the most prominent match. */
  person?: {
    id: number;
    name: string;
    profileUrl?: string;
    department?: string;
    gender?: number;
    roles?: string[];
  };
  personTitles?: Suggestion[];
};
