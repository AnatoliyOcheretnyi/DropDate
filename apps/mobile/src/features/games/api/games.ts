import { apiRequest } from "../../../shared/api/client";
export type GameMode =
  | "release_date"
  | "rating"
  | "poster"
  | "timeline"
  | "year"
  | "movie_director"
  | "director_movie"
  | "movie_actor"
  | "actor_movie";
export type GamePerson = {
  tmdbId: number;
  name: string;
  profileUrl?: string;
  role?: string;
};
export type GameTitle = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year?: string;
  rating?: number;
  posterUrl?: string;
  backdropUrl?: string;
  releaseDate?: string;
};
export type GameQuestion = {
  id: string;
  mode: GameMode;
  prompt: string;
  left?: GameTitle;
  right?: GameTitle;
  answer?: "left" | "right";
  card?: GameTitle;
  options?: GameTitle[];
  answerId?: number;
  items?: GameTitle[];
  person?: GamePerson;
  people?: GamePerson[];
};
export async function getGameQuestions(
  mode: GameMode,
  count = 10,
  signal?: AbortSignal,
  daily = false,
) {
  const payload = await apiRequest<{ items?: GameQuestion[] }>(
    `/games/questions?mode=${mode}&count=${count}${daily ? "&daily=1" : ""}`,
    { signal },
  );
  return payload.items ?? [];
}
export type GameStat = {
  GameID: string;
  Plays: number;
  BestScore: number;
  BestStreak: number;
};
export type Leader = {
  userId: string;
  name: string;
  score: number;
  plays: number;
};
export type GameChallenge = {
  id: string;
  creatorId: string;
  opponentId: string;
  gameId: GameMode;
  seed: number;
  creatorScore?: number;
  opponentScore?: number;
};
export const recordGameResult = (
  gameId: string,
  score: number,
  streak: number,
  daily = false,
) =>
  apiRequest("/games/results", {
    method: "POST",
    auth: true,
    body: { gameId, score, streak, daily },
  });
export const getGameStats = async (signal?: AbortSignal) =>
  apiRequest<{
    items?: GameStat[];
    dailyStreak?: number;
    achievements?: string[];
  }>("/games/stats", { auth: true, signal });
export const getLeaderboard = async (signal?: AbortSignal) => {
  const r = await apiRequest<{ items?: Leader[] }>("/games/leaderboard", {
    auth: true,
    signal,
  });
  return r.items ?? [];
};
export const getChallenges = async (signal?: AbortSignal) => {
  const r = await apiRequest<{ items?: GameChallenge[] }>("/games/challenges", {
    auth: true,
    signal,
  });
  return r.items ?? [];
};
export const createChallenge = (opponentId: string, gameId: string) =>
  apiRequest<GameChallenge>("/games/challenges", {
    method: "POST",
    auth: true,
    body: { opponentId, gameId },
  });
export const submitChallenge = (challengeId: string, score: number) =>
  apiRequest("/games/challenges", {
    method: "POST",
    auth: true,
    body: { challengeId, score },
  });
