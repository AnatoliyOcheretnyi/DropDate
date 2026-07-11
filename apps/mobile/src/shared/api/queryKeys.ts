export const queryKeys = {
  home: (limit = 18) => ['home', limit] as const,
  search: (query: string, page = 1) => ['search', query, page] as const,
  suggestions: (query: string) => ['suggestions', query] as const,
  details: (mediaType: string, id: number) => ['details', mediaType, id] as const,
  saved: ['saved'] as const,
  recommendations: ['recommendations', 'me'] as const,
  notifications: ['notifications'] as const,
  followedPeople: ['people', 'follows'] as const,
  person: (id: number) => ['person', id] as const,
  moodQuestions: ['mood', 'questions'] as const,
  matchQuestions: ['match', 'questions'] as const,
  gameQuestions: (mode: string, count: number) => ['games', mode, count] as const,
} as const;
