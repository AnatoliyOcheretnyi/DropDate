export type TabKey =
  | "follow"
  | "watchlist"
  | "favorite"
  | "liked"
  | "watched"
  | "disliked";

export type TabDefinition = {
  key: TabKey;
  label: string;
  count?: number;
};

export type ProfileStatTone = "green" | "amber" | "blue";

export type ProfileStat = {
  value: string | number;
  label: string;
  tone: ProfileStatTone;
};
