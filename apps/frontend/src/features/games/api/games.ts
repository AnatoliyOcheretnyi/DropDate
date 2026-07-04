import { requestApi } from "../../../shared/api/http";

export type GameMode = "release_date" | "rating";

export type GameTitleCard = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year?: string;
  posterUrl?: string;
  releaseDate?: string;
  rating?: number;
};

export type GameQuestion = {
  id: string;
  mode: GameMode;
  prompt: string;
  left: GameTitleCard;
  right: GameTitleCard;
  answer: "left" | "right";
};

export type GameQuestionsResponse = {
  items: GameQuestion[];
  meta: {
    mode: GameMode;
    count: number;
    generatedAt: string;
  };
};

/**
 * fetchGameQuestions loads a set of comparison questions for a mode through the
 * Next.js proxy. Throws on transport/backend failure so callers can show an
 * error state.
 */
export async function fetchGameQuestions(
  mode: GameMode,
  count: number,
  signal?: AbortSignal
): Promise<GameQuestion[]> {
  const response = await requestApi<GameQuestionsResponse>({
    url: "/api/games/questions",
    method: "GET",
    params: { mode, count },
    signal,
  });

  if (!response.ok || !response.payload) {
    throw new Error("Не вдалося завантажити гру");
  }

  return Array.isArray(response.payload.items) ? response.payload.items : [];
}
