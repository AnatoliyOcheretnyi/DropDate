import { apiRequest } from '../../../shared/api/client';
export type AkinatorAnswer='yes'|'probably'|'unknown'|'probably_not'|'no';
export type AkinatorQuestion={id:string;text:string};export type AkinatorGuess={tmdbId:number;mediaType:'movie';title:string;year?:number;posterUrl?:string;backdropUrl?:string;confidence:number};export type AnsweredQuestion={questionId:string;answer:AkinatorAnswer};
export type AkinatorStep={type:'question'|'guess'|'give_up';step:number;candidates:number;question?:AkinatorQuestion;guess?:AkinatorGuess};
export const startAkinator=()=>apiRequest<{sessionToken:string;question:AkinatorQuestion;step:number;candidates:number}>('/akinator/start');
export const nextAkinator=(sessionToken:string,answers:AnsweredQuestion[])=>apiRequest<AkinatorStep>('/akinator/next',{method:'POST',body:{sessionToken,answers}});
export const finishAkinator=(sessionToken:string,guessTmdbId:number,correct:boolean,answers:AnsweredQuestion[])=>apiRequest('/akinator/result',{method:'POST',body:{sessionToken,guessTmdbId,correct,answers}});
