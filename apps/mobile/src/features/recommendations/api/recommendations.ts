import { apiRequest } from '../../../shared/api/client';
export type RecommendationItem={tmdbId:number;mediaType:'movie'|'tv';title:string;year?:string;posterUrl?:string;reason:{seedCount:number;primarySource:string;text?:string}};
export type RecommendationsResponse={items:RecommendationItem[];meta:{seedCount:number;generatedAt:string}};
export const getRecommendations=(signal?:AbortSignal)=>apiRequest<RecommendationsResponse>('/recommendations/me?limit=18&ai=1',{auth:true,signal});
