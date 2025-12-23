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

export const getReleaseId = (release: ReleaseInfo) => releaseIdentifier(release.title, release.type);

export const getSuggestionId = (suggestion: Suggestion) =>
  releaseIdentifier(suggestion.title, suggestion.mediaType === "movie" ? "movie" : "series");
