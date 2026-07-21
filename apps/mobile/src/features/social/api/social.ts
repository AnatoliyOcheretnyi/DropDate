import { apiRequest } from '../../../shared/api/client';
export type SocialActivity={type:'rating'|'save'|'recommendation'|'friend_accepted';actorId:string;actorName:string;title:string;tmdbId:number;mediaType:'movie'|'tv'|'social';rating?:number;createdAt:string};
export type SharedList={ID:string;OwnerID:string;Name:string;Visibility:'private'|'friends'|'public';ShareToken:string;ItemCount:number;MemberCount:number;CreatedAt:string};
export type SharedListItem={ID:string;AddedBy:string;TMDBID:number;MediaType:'movie'|'tv';Title:string;PosterURL?:string;CreatedAt:string};
export async function getSocialActivity(signal?:AbortSignal){const r=await apiRequest<{items?:SocialActivity[]}>('/social/activity',{auth:true,signal});return r.items??[]}
export async function getSharedLists(signal?:AbortSignal){const r=await apiRequest<{items?:SharedList[]}>('/social/lists',{auth:true,signal});return r.items??[]}
export const createSharedList=(name:string,visibility:SharedList['Visibility'])=>apiRequest<SharedList>('/social/lists',{method:'POST',auth:true,body:{name,visibility}});
export async function getSharedListItems(listId:string,signal?:AbortSignal){const r=await apiRequest<{items?:SharedListItem[]}>(`/social/lists/items?listId=${encodeURIComponent(listId)}`,{auth:true,signal});return r.items??[]}
export const addSharedListMember=(listId:string,userId:string)=>apiRequest('/social/lists/members',{method:'POST',auth:true,body:{listId,userId,role:'editor'}});
export const addTitleToSharedList=(listId:string,title:{tmdbId:number;mediaType:'movie'|'tv';title:string;posterUrl?:string})=>apiRequest(`/social/lists/items?listId=${encodeURIComponent(listId)}`,{method:'POST',auth:true,body:title});
