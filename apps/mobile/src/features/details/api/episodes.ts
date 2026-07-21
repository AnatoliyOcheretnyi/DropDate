import { apiRequest } from '../../../shared/api/client';
export type EpisodeProgress = { seasonNumber: number; episodeNumber: number; watched: boolean; rating?: number };
export type EpisodeMeta = { episodeNumber: number; name: string; airDate?: string; runtime?: number; stillUrl?: string };
export async function getEpisodeProgress(tmdbId: number, signal?: AbortSignal) { const value = await apiRequest<{items?:EpisodeProgress[]}>(`/episodes?tmdbId=${tmdbId}`, { auth:true, signal }); return value.items ?? []; }
export async function getEpisodeMetadata(tmdbId:number,season:number,signal?:AbortSignal){const value=await apiRequest<{items?:EpisodeMeta[]}>(`/episodes/metadata?tmdbId=${tmdbId}&season=${season}`,{auth:true,signal});return value.items??[];}
export const updateEpisodeProgress=(tmdbId:number,body:Record<string,unknown>)=>apiRequest('/episodes',{method:'POST',auth:true,body:{tmdbId,...body}});
