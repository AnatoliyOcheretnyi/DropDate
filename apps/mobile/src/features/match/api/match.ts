import { apiRequest } from '../../../shared/api/client';
export type MatchQuestion={id:string;title:string;appliesTo:'both'|'movie'|'tv';options:{id:string;label:string;emoji?:string}[]}; export type MatchPick={tmdbId:number;mediaType:'movie'|'tv';title:string;year?:string;reason?:string};
export const getMatchQuestions=async(signal?:AbortSignal)=>(await apiRequest<{items:MatchQuestion[]}>('/match/questions',{signal})).items??[];
export const getMatchPicks=async(payload:{answers:Record<string,string>;excludeKeys?:string[]})=>(await apiRequest<{items:MatchPick[]}>('/match/picks',{method:'POST',auth:true,body:{...payload,count:6}})).items??[];
