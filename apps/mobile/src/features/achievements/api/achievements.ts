import { apiRequest } from '../../../shared/api/client';
import type { ListProgress } from '../model/achievements';

type AchievementResponse = { lists?: ListProgress[] };

export async function getAchievements(signal?: AbortSignal) {
  const response = await apiRequest<AchievementResponse>('/achievements', { auth: true, signal });
  return response.lists ?? [];
}

export async function getFriendAchievements(friendId: string, signal?: AbortSignal) {
  const response = await apiRequest<AchievementResponse>(
    `/friends/achievements?friendId=${encodeURIComponent(friendId)}`,
    { auth: true, signal },
  );
  return response.lists ?? [];
}
