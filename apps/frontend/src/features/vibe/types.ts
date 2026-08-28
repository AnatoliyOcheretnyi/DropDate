import type { Suggestion } from "../../shared/lib/release";

/** One chip in the "Ми зрозуміли так" panel. */
export type VibeLabel = {
  kind: "theme" | "genre" | "country" | "years" | "media";
  id: string;
  label: string;
  emoji?: string;
};

/**
 * What the engine understood — and, once the user edits the chips, what they
 * corrected it to. Posting it back re-runs the query without any AI call.
 */
export type VibePlan = {
  phrase?: string;
  themes: string[];
  genres: string[];
  excludeGenres?: string[];
  mediaTypes?: string[];
  countries?: string[];
  yearFrom?: number;
  yearTo?: number;
  summary?: string;
  source?: "ai" | "keywords" | "manual" | string;
};

export type VibeResponse = {
  plan: VibePlan;
  labels: VibeLabel[];
  results: Suggestion[];
  page: number;
  hasMore: boolean;
  reranked: boolean;
  source: string;
};

export type VibeTheme = { id: string; label: string; emoji?: string };
export type VibeThemeGroup = { id: string; label: string; items: VibeTheme[] };

export type VibeVocabulary = {
  themes: VibeThemeGroup[];
  genres: { slug: string; label: string }[];
  countries: { code: string; label: string }[];
};

export const EXAMPLE_PHRASES = [
  "комедія з привидами",
  "щось легке про любов",
  "розумна фантастика без екшену",
  "детектив у маленькому місті",
];
