import { apiRequest } from '../../../shared/api/client';
import type { FriendSearchResult, FriendsResponse, Friendship } from '../model/friends';

export const getFriends = (signal?: AbortSignal) => apiRequest<FriendsResponse>('/friends', { auth: true, signal });

export async function searchFriends(query: string, signal?: AbortSignal) {
  const response = await apiRequest<{ results?: FriendSearchResult[] }>(`/friends/search?query=${encodeURIComponent(query)}`, { auth: true, signal });
  return response.results ?? [];
}

export const sendFriendRequest = (query: string) => apiRequest<Friendship>('/friends/requests', { method: 'POST', auth: true, body: { query } });
export const respondFriendRequest = (friendshipId: string, accept: boolean) => apiRequest<void>('/friends/requests/respond', { method: 'POST', auth: true, body: { friendshipId, accept } });
export const removeFriendship = (friendshipId: string) => apiRequest<void>(`/friends?friendshipId=${encodeURIComponent(friendshipId)}`, { method: 'DELETE', auth: true });
