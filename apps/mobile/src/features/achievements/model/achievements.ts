export type AchievementListKey = 'total' | 'follow' | 'watchlist' | 'favorite' | 'liked' | 'watched' | 'disliked';

export type ListProgress = {
  listKey: AchievementListKey;
  count: number;
  unlockedTiers: number[];
  nextTier?: number;
};

export const ACHIEVEMENT_TIERS = [1, 10, 50, 100, 200, 500, 1000] as const;

export const achievementMeta: Record<AchievementListKey, { label: string; icon: string }> = {
  total: { label: 'Загальний рівень', icon: '🎬' },
  watched: { label: 'Переглянуто', icon: '👀' },
  favorite: { label: 'Улюблене', icon: '💚' },
  liked: { label: 'Сподобалось', icon: '👍' },
  disliked: { label: 'Не сподобалось', icon: '👎' },
  watchlist: { label: 'Хочу подивитись', icon: '📌' },
  follow: { label: 'Підписки', icon: '🔔' },
};
