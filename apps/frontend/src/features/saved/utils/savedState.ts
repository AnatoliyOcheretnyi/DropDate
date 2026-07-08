"use client";

import type { ReleaseInfo, Suggestion } from "../../../shared/lib/release";
import {
  getSuggestionId,
  savedIdentifier,
  type ListType,
  type SavedRelease,
} from "../../../shared/types/releases";

const STATUS_LISTS: ListType[] = ["favorite", "liked", "watched", "disliked"];
// Priority when collapsing several mutually-exclusive verdicts into one.
const STATUS_PRIORITY: ListType[] = ["favorite", "liked", "watched", "disliked"];

export const normalizeListTypes = (listTypes?: ListType[]) => {
  if (!listTypes) {
    return ["follow"] as ListType[];
  }
  if (listTypes.length === 0) {
    return [];
  }
  const unique = Array.from(new Set(listTypes));
  const statuses = unique.filter((entry) => STATUS_LISTS.includes(entry));
  if (statuses.length > 1) {
    const preferred =
      STATUS_PRIORITY.find((entry) => statuses.includes(entry)) || statuses[0];
    return unique.filter(
      (entry) => !STATUS_LISTS.includes(entry) || entry === preferred
    );
  }
  return unique;
};

export const normalizeSavedRelease = (
  item: SavedRelease & { listType?: string }
): SavedRelease => ({
  ...item,
  id: savedIdentifier({
    title: item.title,
    type: item.type,
    tmdbId: item.tmdbId,
    mediaType: item.mediaType,
  }),
  listTypes: normalizeListTypes(
    item.listTypes ?? (item.listType ? [item.listType as ListType] : undefined)
  ),
});

export const hasFollowItems = (saved: SavedRelease[]) =>
  saved.some((item) => {
    const listTypes =
      item.listTypes && item.listTypes.length > 0
        ? item.listTypes
        : (["follow"] as ListType[]);
    return listTypes.includes("follow");
  });

export const buildSavedId = (
  release: ReleaseInfo,
  meta?: { tmdbId?: number; mediaType?: Suggestion["mediaType"] }
) =>
  savedIdentifier({
    title: release.title,
    type: release.type,
    tmdbId: meta?.tmdbId,
    mediaType: meta?.mediaType,
  });

export const getSavedListTypes = (
  savedById: Map<string, SavedRelease>,
  suggestion: Suggestion
) => {
  const item = savedById.get(getSuggestionId(suggestion));
  return item ? normalizeListTypes(item.listTypes) : [];
};
