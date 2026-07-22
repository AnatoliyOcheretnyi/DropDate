import type { ReactNode } from "react";
import type { ListType } from "../types/releases";
import { copy } from "./strings";

/**
 * The "status" lists are mutually exclusive — a title can be favorite OR
 * watched OR disliked, but not several at once. Mirrors ListPickerModal.
 */
export const STATUS_LISTS: ListType[] = [
  "favorite",
  "liked",
  "watched",
  "disliked",
];

// A title is either something you plan to watch (`watchlist`) or something you
// already have a verdict on (a status list) — never both. `follow` is
// orthogonal (release alerts) and coexists with any of them.
const EXCLUSIVE_LISTS: ListType[] = ["watchlist", ...STATUS_LISTS];

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

const likedIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M21 10h-4V6.5C17 4.6 15.7 4 14.8 4c-.5 0-.9.3-1 .8l-1.2 5.2c-.1.5-.5 1-1 1.3L9 12v8h8.3c.8 0 1.5-.5 1.8-1.2l2.1-5.3c.5-1.3-.5-2.5-1.9-2.5H21Zm-18 2h3v8H3v-8Z"
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
    <g transform="scale(1,-1) translate(0,-24)">
      <path
        d="M21 10h-4V6.5C17 4.6 15.7 4 14.8 4c-.5 0-.9.3-1 .8l-1.2 5.2c-.1.5-.5 1-1 1.3L9 12v8h8.3c.8 0 1.5-.5 1.8-1.2l2.1-5.3c.5-1.3-.5-2.5-1.9-2.5H21Zm-18 2h3v8H3v-8Z"
        fill="currentColor"
      />
    </g>
  </svg>
);

export const LIST_META: ListMeta[] = [
  { type: "follow", label: copy.lists.follow, icon: followIcon },
  { type: "watchlist", label: copy.lists.watchlist, icon: watchlistIcon },
  { type: "favorite", label: copy.lists.favorite, icon: favoriteIcon },
  { type: "liked", label: copy.lists.liked, icon: likedIcon },
  { type: "watched", label: copy.lists.watched, icon: watchedIcon },
  { type: "disliked", label: copy.lists.disliked, icon: dislikedIcon },
];

/**
 * Computes the next selection when a single list chip is toggled. Adding an
 * exclusive list (watchlist or a status) drops the others in that group, so
 * moving "want to watch" → "liked" actually moves it instead of leaving the
 * title in both. `follow` is never evicted.
 */
export function toggleListType(
  selected: ListType[],
  type: ListType,
): ListType[] {
  const active = selected.includes(type);
  if (active) {
    return selected.filter((entry) => entry !== type);
  }
  const isExclusive = EXCLUSIVE_LISTS.includes(type);
  return [
    ...selected.filter(
      (entry) => !isExclusive || !EXCLUSIVE_LISTS.includes(entry),
    ),
    type,
  ];
}
