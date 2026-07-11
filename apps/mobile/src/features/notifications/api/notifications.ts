import { apiRequest } from '../../../shared/api/client';
export type NotificationItem={id:string;tmdbId:number;mediaType:'movie'|'tv';title:string;eventType:'movie_release'|'episode_release';seasonNumber?:number;episodeNumber?:number;episodeName?:string;releaseDate?:string;readAt?:string;createdAt:string};
export type NotificationsResponse={items:NotificationItem[];unreadCount:number};
export const getNotifications=(signal?:AbortSignal)=>apiRequest<NotificationsResponse>('/notifications?limit=100',{auth:true,signal});
export const markNotificationsRead=(ids?:string[])=>apiRequest<void>('/notifications/read',{method:'POST',auth:true,body:ids?.length?{ids}:{all:true}});
