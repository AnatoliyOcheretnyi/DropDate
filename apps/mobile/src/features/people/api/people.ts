import { apiRequest } from '../../../shared/api/client'; import type { Person,PersonFollow,PersonPick,PersonRole } from '../../../shared/types/release';
export const getPerson=async(id:number,signal?:AbortSignal)=>(await apiRequest<{person:Person}>(`/person?id=${id}`,{signal})).person;
export const getPersonPick=async(id:number,role:PersonRole,signal?:AbortSignal)=>(await apiRequest<{pick?:PersonPick}>(`/person/recommend?id=${id}&role=${role}`,{auth:true,signal})).pick;
export const getFollows=async(signal?:AbortSignal)=>(await apiRequest<{items:PersonFollow[]}>('/people/follows',{auth:true,signal})).items??[];
export const saveFollow=(payload:{personId:number;role:PersonRole;name:string;profileUrl?:string;knownFor?:string;liked:boolean;subscribed:boolean})=>apiRequest<PersonFollow>('/people/follows',{method:'POST',auth:true,body:payload});
export const deleteFollow=(personId:number,role:PersonRole)=>apiRequest<void>(`/people/follows?personId=${personId}&role=${role}`,{method:'DELETE',auth:true});
