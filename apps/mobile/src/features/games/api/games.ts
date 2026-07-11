import { apiRequest } from '../../../shared/api/client';
export type GameMode = 'release_date' | 'rating';
export type GameTitle = { tmdbId: number; mediaType: 'movie' | 'tv'; title: string; year?: string; rating?: number;posterUrl?:string;releaseDate?:string };
export type GameQuestion = { id: string; mode: GameMode; prompt: string; left: GameTitle; right: GameTitle; answer: 'left' | 'right' };
export async function getGameQuestions(mode: GameMode, count = 5, signal?: AbortSignal) {
  const payload = await apiRequest<{ items: GameQuestion[] }>(`/games/questions?mode=${mode}&count=${count}`, { signal });
  return payload.items ?? [];
}
