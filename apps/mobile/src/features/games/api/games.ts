import { apiRequest } from '../../../shared/api/client';
export type GameMode='release_date'|'rating'|'poster'|'timeline'|'year'|'movie_director'|'director_movie'|'movie_actor'|'actor_movie';
export type GamePerson={tmdbId:number;name:string;profileUrl?:string;role?:string};
export type GameTitle={tmdbId:number;mediaType:'movie'|'tv';title:string;year?:string;rating?:number;posterUrl?:string;backdropUrl?:string;releaseDate?:string};
export type GameQuestion={id:string;mode:GameMode;prompt:string;left?:GameTitle;right?:GameTitle;answer?:'left'|'right';card?:GameTitle;options?:GameTitle[];answerId?:number;items?:GameTitle[];person?:GamePerson;people?:GamePerson[]};
export async function getGameQuestions(mode:GameMode,count=10,signal?:AbortSignal){const payload=await apiRequest<{items?:GameQuestion[]}>(`/games/questions?mode=${mode}&count=${count}`,{signal});return payload.items??[]}
