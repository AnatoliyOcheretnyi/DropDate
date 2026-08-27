import type { ReleaseInfo, Suggestion } from "../lib/release";

export type ListType =
  | "follow"
  | "watchlist"
  | "favorite"
  | "liked"
  | "watched"
  | "disliked";

export type SavedRelease = ReleaseInfo & {
  id: string;
  tmdbId?: number;
  mediaType?: Suggestion["mediaType"];
  listTypes?: ListType[];
  userRating?: number;
  watchCount?: number;
  lastWatchedAt?: string;
  runtimeMinutes?: number;
  episodeCount?: number;
  tmdbRating?: number;
  /** TMDB genres captured when the title was saved. Empty for rows written before migration 023. */
  genres?: string[];
  /** When the title first entered the library — drives the "Нещодавно додані" sort. */
  createdAt?: string;
};

const normalizeTitle = (value: string) => value.trim().toLowerCase();

export const releaseIdentifier = (title: string, type: ReleaseInfo["type"]) =>
  `${normalizeTitle(title)}::${type}`;

export const savedIdentifier = (data: {
  title: string;
  type: ReleaseInfo["type"];
  tmdbId?: number;
  mediaType?: Suggestion["mediaType"];
}) => {
  if (data.tmdbId && data.mediaType) {
    return `tmdb:${data.tmdbId}:${data.mediaType}`;
  }
  return releaseIdentifier(data.title, data.type);
};

export const getReleaseId = (release: ReleaseInfo) =>
  releaseIdentifier(release.title, release.type);

export const getSuggestionId = (suggestion: Suggestion) =>
  savedIdentifier({
    title: suggestion.title,
    type: suggestion.mediaType === "movie" ? "movie" : "series",
    tmdbId: suggestion.id,
    mediaType: suggestion.mediaType,
  });
