export const webQueryKeys = {
  suggestions: (query: string) => ["suggestions", query] as const,
  search: (query: string) => ["search", query] as const,
  discover: (genres: string[], countries: string[]) =>
    ["discover", genres.join(","), countries.join(",")] as const,
  details: (mediaType: string, id: number) =>
    ["details", mediaType, id] as const,
  recommendations: (userId: string) => ["recommendations", userId] as const,
  notifications: (userId: string) => ["notifications", userId] as const,
  releaseHistory: (userId: string) => ["release-history", userId] as const,
  saved: (userId: string) => ["saved", userId] as const,
  home: () => ["home"] as const,
  person: (id: number) => ["person", id] as const,
  personPick: (id: number, role: string) => ["person-pick", id, role] as const,
  personFollows: (userId: string) => ["person-follows", userId] as const,
};
