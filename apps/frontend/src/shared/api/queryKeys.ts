export const webQueryKeys = {
  suggestions: (query: string) => ["suggestions", query] as const,
  search: (query: string) => ["search", query] as const,
  discover: (genres: string[], countries: string[]) =>
    ["discover", genres.join(","), countries.join(",")] as const,
  details: (mediaType: string, id: number) =>
    ["details", mediaType, id] as const,
  recommendations: (userId: string) => ["recommendations", userId] as const,
  recommendationFeedback: (userId: string) =>
    ["recommendation-feedback", userId] as const,
  dailyPick: (userId: string) => ["daily-pick", userId] as const,
  dailyPickState: (userId: string, date: string) =>
    ["daily-pick-state", userId, date] as const,
  taste: (userId: string, kind: string) => ["taste", userId, kind] as const,
  tasteOnboarding: (userId: string) => ["taste-onboarding", userId] as const,
  notifications: (userId: string) => ["notifications", userId] as const,
  releaseHistory: (userId: string) => ["release-history", userId] as const,
  saved: (userId: string) => ["saved", userId] as const,
  home: () => ["home"] as const,
  person: (id: number) => ["person", id] as const,
  personPick: (id: number, role: string) => ["person-pick", id, role] as const,
  personFollows: (userId: string) => ["person-follows", userId] as const,
  achievements: (userId: string) => ["achievements", userId] as const,
  friends: (userId: string) => ["friends", userId] as const,
  friendSaved: (friendId: string, listType: string) =>
    ["friend-saved", friendId, listType] as const,
  friendAchievements: (friendId: string) =>
    ["friend-achievements", friendId] as const,
  friendFollows: (friendId: string) => ["friend-follows", friendId] as const,
};
