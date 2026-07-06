import type { ReactNode } from "react";
import type { ListType } from "../types/releases";
import { copy } from "./strings";

/**
 * The "status" lists are mutually exclusive — a title can be favorite OR
 * watched OR disliked, but not several at once. Mirrors ListPickerModal.
 */
export const STATUS_LISTS: ListType[] = ["favorite", "watched", "disliked"];

export type ListMeta = {
  type: ListType;
  label: string;
  icon: ReactNode;
};

const followIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm6-6v-4a6 6 0 1 0-12 0v4l-2 2v1h16v-1l-2-2Z"
      fill="currentColor"
    />
  </svg>
);

const watchlistIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 6.3c-4.4 0-7.8 2.6-9.7 5.7 2 3.1 5.3 5.7 9.7 5.7s7.8-2.6 9.7-5.7c-2-3.1-5.3-5.7-9.7-5.7Z"
      fill="currentColor"
    />
    <circle cx="12" cy="12" r="2.6" fill="#08121c" />
  </svg>
);

const favoriteIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="m12 20.5-1.3-1.15C6.1 15.2 3.2 12.6 3.2 9.4 3.2 6.8 5.25 4.8 7.85 4.8c1.47 0 2.88.68 3.8 1.76.92-1.08 2.33-1.76 3.8-1.76 2.6 0 4.65 2 4.65 4.6 0 3.2-2.9 5.8-7.5 9.95L12 20.5Z"
      fill="currentColor"
    />
  </svg>
);

const watchedIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm4.2-12.6-5.2 5.2-2.4-2.4-1.4 1.4 3.8 3.8 6.6-6.6-1.4-1.4Z"
      fill="currentColor"
    />
  </svg>
);

const dislikedIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M3 10h4v10H3V10Zm6.2 0h6.1c.9 0 1.7.4 2.2 1.1l2.2 3.3c.3.5.5 1 .5 1.6V20a2 2 0 0 1-2 2h-5c-.8 0-1.5-.4-1.9-1l-2.1-3.1v-7.9Z"
      fill="currentColor"
    />
  </svg>
);

export const LIST_META: ListMeta[] = [
  { type: "follow", label: copy.lists.follow, icon: followIcon },
  { type: "watchlist", label: copy.lists.watchlist, icon: watchlistIcon },
  { type: "favorite", label: copy.lists.favorite, icon: favoriteIcon },
  { type: "watched", label: copy.lists.watched, icon: watchedIcon },
  { type: "disliked", label: copy.lists.disliked, icon: dislikedIcon },
];

/**
 * Computes the next selection when a single list chip is toggled, preserving
 * the mutual-exclusivity rule for status lists.
 */
export function toggleListType(
  selected: ListType[],
  type: ListType
): ListType[] {
  const active = selected.includes(type);
  if (active) {
    return selected.filter((entry) => entry !== type);
  }
  return [
    ...selected.filter(
      (entry) =>
        !STATUS_LISTS.includes(type) || !STATUS_LISTS.includes(entry)
    ),
    type,
  ];
}
