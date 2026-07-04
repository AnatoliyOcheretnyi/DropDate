export const webQueryKeys = {
  suggestions: (query: string) => ["suggestions", query] as const,
  search: (query: string) => ["search", query] as const,
  details: (mediaType: string, id: number) =>
    ["details", mediaType, id] as const,
  recommendations: (userId: string) => ["recommendations", userId] as const,
  notifications: (userId: string) => ["notifications", userId] as const,
};
