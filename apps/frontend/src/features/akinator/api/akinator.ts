import { requestApi } from "../../../shared/api/http";

export type AkinatorAnswer = "yes" | "probably" | "unknown" | "probably_not" | "no";
export type AkinatorQuestion = { id: string; text: string };
export type AkinatorAnswerItem = { questionId: string; answer: AkinatorAnswer };
export type AkinatorGuess = { tmdbId: number; mediaType: "movie"; title: string; year?: number; posterUrl?: string; backdropUrl?: string; confidence: number };
export type AkinatorStep = { type: "question" | "guess" | "give_up"; step: number; candidates: number; question?: AkinatorQuestion; guess?: AkinatorGuess };
export type AkinatorStart = { sessionToken: string; question: AkinatorQuestion; step: number; candidates: number };

export class AkinatorApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function startAkinator(signal?: AbortSignal) {
  const response = await requestApi<AkinatorStart>({ url: "/api/akinator/start", method: "GET", signal });
  if (!response.ok || !response.payload) {
    const message = response.status === 404
      ? "Production backend ще не оновлений до версії з Кіноакінатором."
      : "Готую каталог фільмів. Це може зайняти до хвилини.";
    throw new AkinatorApiError(message, response.status);
  }
  return response.payload;
}

export async function nextAkinator(sessionToken: string, answers: AkinatorAnswerItem[]) {
  const response = await requestApi<AkinatorStep>({ url: "/api/akinator/next", method: "POST", data: { sessionToken, answers } });
  if (!response.ok || !response.payload) throw new Error("Не вдалося продовжити гру");
  return response.payload;
}

export async function logAkinatorResult(sessionToken: string, guessTmdbId: number, correct: boolean, answers: AkinatorAnswerItem[]) {
  await requestApi<{ ok: boolean }>({ url: "/api/akinator/result", method: "POST", data: { sessionToken, guessTmdbId, correct, answers } });
}
