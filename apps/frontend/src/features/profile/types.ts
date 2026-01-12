export type TabKey = "follow" | "watchlist" | "favorite" | "watched" | "disliked";

export type TabDefinition = {
  key: TabKey;
  label: string;
};

export type ProfileStatTone = "green" | "amber" | "blue";

export type ProfileStat = {
  value: string | number;
  label: string;
  tone: ProfileStatTone;
};
