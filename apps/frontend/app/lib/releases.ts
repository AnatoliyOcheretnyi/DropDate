import type { ReleaseInfo, Suggestion } from "../../lib/release";

export const STORAGE_KEY = "dropdate:saved-releases";

export type SavedRelease = ReleaseInfo & {
  id: string;
  tmdbId?: number;
  mediaType?: Suggestion["mediaType"];
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
