import { apiRequest } from "../../../shared/api/client";
import type { Suggestion } from "../../../shared/types/release";

/** One chip in the "ми зрозуміли так" row. */
export type VibeLabel = {
  kind: "theme" | "genre" | "country" | "years" | "media";
  id: string;
  label: string;
  emoji?: string;
};

/**
 * What the engine understood. Posting it back re-runs the query with no AI
 * call, which is what makes editing a chip feel instant.
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
  source?: string;
};

export type VibeResponse = {
  plan: VibePlan;
  labels: VibeLabel[];
  results: Suggestion[];
  page: number;
  hasMore: boolean;
  /** The strict reading came back empty, so themes were widened to "any of". */
  broadened: boolean;
};

const asArray = (value: string[] | null | undefined) =>
  Array.isArray(value) ? value : [];

/**
 * A plan with no genres arrives as `"genres": null`, and every caller reads
 * them straight off the plan. Normalising here keeps one null from crashing
 * the chip row.
 */
const normalize = (response: VibeResponse): VibeResponse => ({
  ...response,
  plan: {
    ...response.plan,
    themes: asArray(response.plan?.themes),
    genres: asArray(response.plan?.genres),
  },
  labels: response.labels ?? [],
  results: response.results ?? [],
});

export async function searchByPhrase(
  phrase: string,
  page = 1,
  signal?: AbortSignal,
): Promise<VibeResponse> {
  return normalize(
    await apiRequest<VibeResponse>("/vibe", {
      method: "POST",
      body: { phrase, page },
      signal,
    }),
  );
}

/** Re-runs an edited plan; no interpretation happens, so this is instant. */
export async function searchByPlan(
  plan: VibePlan,
  page = 1,
  signal?: AbortSignal,
): Promise<VibeResponse> {
  return normalize(
    await apiRequest<VibeResponse>("/vibe/plan", {
      method: "POST",
      body: { plan, page },
      signal,
    }),
  );
}

/** Drops one understood chip and returns the plan to re-run. */
export function planWithout(plan: VibePlan, label: VibeLabel): VibePlan {
  switch (label.kind) {
    case "theme":
      return { ...plan, themes: plan.themes.filter((id) => id !== label.id) };
    case "genre":
      return { ...plan, genres: plan.genres.filter((id) => id !== label.id) };
    case "country":
      return {
        ...plan,
        countries: (plan.countries ?? []).filter((id) => id !== label.id),
      };
    case "media":
      return {
        ...plan,
        mediaTypes: (plan.mediaTypes ?? []).filter((id) => id !== label.id),
      };
    case "years":
      return { ...plan, yearFrom: undefined, yearTo: undefined };
    default:
      return plan;
  }
}
