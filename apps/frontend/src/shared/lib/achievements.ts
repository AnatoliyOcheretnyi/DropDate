import type { ListType } from "../types/releases";

export type AchievementListKey = "total" | ListType;

export type ListProgress = {
  listKey: AchievementListKey;
  count: number;
  unlockedTiers: number[];
  nextTier?: number;
};

export type UnlockedAchievement = {
  listKey: AchievementListKey;
  tier: number;
};

export const ACHIEVEMENT_TIERS = [1, 10, 50, 100, 200, 500, 1000] as const;

export type AchievementTier = (typeof ACHIEVEMENT_TIERS)[number];

export type TierMeta = {
  name: string;
  icon: string;
};

export const ACHIEVEMENT_LIST_LABELS: Record<AchievementListKey, string> = {
  total: "Загальний рівень",
  watched: "Переглянуто",
  favorite: "Улюблене",
  liked: "Сподобалось",
  disliked: "Не сподобалось",
  watchlist: "Хочу подивитись",
  follow: "Підписка",
};

export const ACHIEVEMENT_LIST_ICONS: Record<AchievementListKey, string> = {
  total: "🎬",
  watched: "👀",
  favorite: "💚",
  liked: "👍",
  disliked: "👎",
  watchlist: "📌",
  follow: "🔔",
};

// Thematic naming ladder per list — each list gets its own flavor instead of
// reusing generic tier names, so unlocking feels specific to what you did.
const LADDERS: Record<AchievementListKey, Record<AchievementTier, TierMeta>> = {
  total: {
    1: { name: "Перший кадр", icon: "🎬" },
    10: { name: "Глядач", icon: "🍿" },
    50: { name: "Кіноман", icon: "🎞️" },
    100: { name: "Кінокритик", icon: "🏆" },
    200: { name: "Синефіл", icon: "🌟" },
    500: { name: "Хранитель кінотеки", icon: "📽️" },
    1000: { name: "Легенда DropDate", icon: "👑" },
  },
  watched: {
    1: { name: "Перший перегляд", icon: "👀" },
    10: { name: "Вечір на дивані", icon: "🛋️" },
    50: { name: "Завсідник кінозалу", icon: "🎟️" },
    100: { name: "Марафонець", icon: "🍿" },
    200: { name: "Хронофаг", icon: "⏳" },
    500: { name: "Кіноархів на ногах", icon: "🎥" },
    1000: { name: "Кінотека", icon: "🏛️" },
  },
  favorite: {
    1: { name: "Перша любов", icon: "💚" },
    10: { name: "Колекціонер шедеврів", icon: "💎" },
    50: { name: "Хранитель улюбленого", icon: "🗝️" },
    100: { name: "Куратор смаку", icon: "👑" },
    200: { name: "Естет", icon: "🏆" },
    500: { name: "Особистий канон", icon: "🌌" },
    1000: { name: "Зала слави", icon: "✨" },
  },
  liked: {
    1: { name: "Перший лайк", icon: "👍" },
    10: { name: "Позитивник", icon: "😊" },
    50: { name: "Цінитель", icon: "🌟" },
    100: { name: "Точний смак", icon: "🎯" },
    200: { name: "Знавець хорошого кіно", icon: "💫" },
    500: { name: "Майстер вибору", icon: "🏅" },
    1000: { name: "Оракул смаку", icon: "🔮" },
  },
  disliked: {
    1: { name: "Перший розчарований", icon: "👎" },
    10: { name: "Скептик", icon: "🙄" },
    50: { name: "Суворий критик", icon: "🎭" },
    100: { name: "Нещадний суддя", icon: "🔥" },
    200: { name: "Мисливець на розчарування", icon: "⚔️" },
    500: { name: "Знищувач поганого кіно", icon: "🗑️" },
    1000: { name: "Легенда розгромних рецензій", icon: "💀" },
  },
  watchlist: {
    1: { name: "Перша ціль", icon: "📌" },
    10: { name: "Список росте", icon: "📋" },
    50: { name: "Архітектор черги", icon: "🗂️" },
    100: { name: "Бібліотекар намірів", icon: "📚" },
    200: { name: "Планувальник вечорів", icon: "🧭" },
    500: { name: "Гора «подивитись колись»", icon: "🏔️" },
    1000: { name: "Нескінченний список", icon: "🌌" },
  },
  follow: {
    1: { name: "Перша підписка", icon: "🔔" },
    10: { name: "На звʼязку", icon: "📡" },
    50: { name: "Кіношпигун", icon: "🕵️" },
    100: { name: "Інсайдер", icon: "📰" },
    200: { name: "Головний фанат", icon: "🎙️" },
    500: { name: "Всевидяче око", icon: "🛰️" },
    1000: { name: "Володар стрічки релізів", icon: "🌐" },
  },
};

export function getTierMeta(
  listKey: AchievementListKey,
  tier: number
): TierMeta | undefined {
  return LADDERS[listKey]?.[tier as AchievementTier];
}

export function getLadder(
  listKey: AchievementListKey
): Record<AchievementTier, TierMeta> {
  return LADDERS[listKey];
}
