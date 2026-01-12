"use client";

import type { ListType } from "../types/releases";

type Props = {
  listTypes: ListType[];
};

export function ListBadges({ listTypes }: Props) {
  if (listTypes.length === 0) {
    return null;
  }

  return (
    <div className="list-badges" aria-hidden="true">
      {listTypes.includes("follow") && (
        <span className="list-badge" title="Підписка">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm6-6v-4a6 6 0 1 0-12 0v4l-2 2v1h16v-1l-2-2Z"
              fill="currentColor"
            />
          </svg>
        </span>
      )}
      {listTypes.includes("watchlist") && (
        <span className="list-badge" title="Want to watch">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 6.3c-4.4 0-7.8 2.6-9.7 5.7 2 3.1 5.3 5.7 9.7 5.7s7.8-2.6 9.7-5.7c-2-3.1-5.3-5.7-9.7-5.7Z"
              fill="currentColor"
            />
            <circle cx="9" cy="12" r="2.2" fill="currentColor" />
            <circle cx="15" cy="12" r="2.2" fill="currentColor" />
          </svg>
        </span>
      )}
      {listTypes.includes("favorite") && (
        <span className="list-badge" title="Favorites">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="m12 17.3 5.2 3.2-1.4-6.1 4.8-4.2-6.3-0.5L12 3.8 9.7 9.7l-6.3 0.5 4.8 4.2-1.4 6.1L12 17.3Z"
              fill="currentColor"
            />
          </svg>
        </span>
      )}
      {listTypes.includes("watched") && (
        <span className="list-badge" title="Переглянуто">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm4.2-12.6-5.2 5.2-2.4-2.4-1.4 1.4 3.8 3.8 6.6-6.6-1.4-1.4Z"
              fill="currentColor"
            />
          </svg>
        </span>
      )}
      {listTypes.includes("disliked") && (
        <span className="list-badge" title="Не сподобалось">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M3 10h4v10H3V10Zm6.2 0h6.1c.9 0 1.7.4 2.2 1.1l2.2 3.3c.3.5.5 1 .5 1.6V20a2 2 0 0 1-2 2h-5c-.8 0-1.5-.4-1.9-1l-2.1-3.1v-7.9Z"
              fill="currentColor"
            />
          </svg>
        </span>
      )}
    </div>
  );
}
