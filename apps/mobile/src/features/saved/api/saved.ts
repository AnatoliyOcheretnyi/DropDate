import{apiRequest}from'../../../shared/api/client';import type{ListType}from'../../../shared/types/lists';import type{ReleaseInfo,Suggestion}from'../../../shared/types/release';import type{SavedItem}from'../store/savedStore';
type Wire=Omit<SavedItem,'id'|'savedAt'|'details'>;
const normalize=(x:Wire):SavedItem=>({...x,id:`${x.mediaType}:${x.tmdbId}`,savedAt:Date.now(),listTypes:x.listTypes?.length?x.listTypes:['follow']});
export async function fetchSaved(signal?:AbortSignal){const r=await apiRequest<{items?:Wire[]}>('/saved',{auth:true,signal});return(r.items??[]).map(normalize)}
export const saveTitle=(release:ReleaseInfo,item:Suggestion,listType:ListType)=>apiRequest<Wire>('/saved',{method:'POST',auth:true,body:{tmdbId:item.id,mediaType:item.mediaType,title:release.title,nextRelease:release.nextRelease,status:release.status,posterUrl:release.posterUrl,backdropUrl:release.backdropUrl,listType}});
export const deleteSaved=(tmdbId:number,mediaType:Suggestion['mediaType'],listType?:ListType)=>apiRequest<void>(`/saved/item?tmdbId=${tmdbId}&mediaType=${mediaType}${listType?`&listType=${listType}`:''}`,{method:'DELETE',auth:true});
export const patchSavedStats=(item:Suggestion,listType:ListType,stats:{userRating?:number;watchCount?:number;lastWatchedAt?:string})=>apiRequest('/saved/item',{method:'PATCH',auth:true,body:{tmdbId:item.id,mediaType:item.mediaType,listType,...stats}});
