import { requestApi } from "../../../shared/api/http";

export type GameMode = "release_date" | "rating" | "poster" | "timeline" | "year" | "movie_director" | "director_movie" | "movie_actor" | "actor_movie";

export type GamePersonCard = { tmdbId: number; name: string; profileUrl?: string; role?: string };

export type GameTitleCard = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year?: string;
  posterUrl?: string;
  backdropUrl?: string;
  releaseDate?: string;
  rating?: number;
};

/**
 * One round. Pair modes fill left/right/answer; poster fills card/options/
 * answerId; timeline fills items (shuffled, dates included for the reveal);
 * year fills card.
 */
export type GameQuestion = {
  id: string;
  mode: GameMode;
  prompt: string;
  left?: GameTitleCard;
  right?: GameTitleCard;
  answer?: "left" | "right";
  card?: GameTitleCard;
  options?: GameTitleCard[];
  answerId?: number;
  items?: GameTitleCard[];
  person?: GamePersonCard;
  people?: GamePersonCard[];
};

export type GameQuestionsResponse = {
  items: GameQuestion[];
  meta: {
    mode: GameMode;
    count: number;
    generatedAt: string;
  };
};

type FetchOptions = {
  signal?: AbortSignal;
  /** Request the deterministic daily set (same for every player). */
  daily?: boolean;
  seed?: string;
};

/**
 * fetchGameQuestions loads a set of questions for a mode through the Next.js
 * proxy. Throws on transport/backend failure so callers can show an error
 * state.
 */
export async function fetchGameQuestions(
  mode: GameMode,
  count: number,
  options: FetchOptions = {}
): Promise<GameQuestion[]> {
  const response = await requestApi<GameQuestionsResponse>({
    url: "/api/games/questions",
    method: "GET",
    params: { mode, count, ...(options.daily ? { daily: 1 } : {}), ...(options.seed ? { seed: options.seed } : {}) },
    signal: options.signal,
  });

  if (!response.ok || !response.payload) {
    throw new Error("Не вдалося завантажити гру");
  }

  return Array.isArray(response.payload.items) ? response.payload.items : [];
}
