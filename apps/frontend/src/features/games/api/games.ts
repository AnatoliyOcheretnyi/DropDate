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
  const params = new URLSearchParams({ mode, count: String(count) });
  const response = await fetch(`/api/games/questions?${params.toString()}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("Не вдалося завантажити гру");
  }

  const payload = (await response.json().catch(() => null)) as
    | GameQuestionsResponse
    | null;
  return Array.isArray(payload?.items) ? payload!.items : [];
}
