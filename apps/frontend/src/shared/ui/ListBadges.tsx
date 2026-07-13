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
        <span className="list-badge" title="Хочу подивитись">
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
        <span className="list-badge" title="Улюблене">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="m12 17.3 5.2 3.2-1.4-6.1 4.8-4.2-6.3-0.5L12 3.8 9.7 9.7l-6.3 0.5 4.8 4.2-1.4 6.1L12 17.3Z"
              fill="currentColor"
            />
          </svg>
        </span>
      )}
      {listTypes.includes("liked") && (
        <span className="list-badge" title="Сподобалось">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M21 10h-4V6.5C17 4.6 15.7 4 14.8 4c-.5 0-.9.3-1 .8l-1.2 5.2c-.1.5-.5 1-1 1.3L9 12v8h8.3c.8 0 1.5-.5 1.8-1.2l2.1-5.3c.5-1.3-.5-2.5-1.9-2.5H21Zm-18 2h3v8H3v-8Z"
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
            <g transform="scale(1,-1) translate(0,-24)">
              <path
                d="M21 10h-4V6.5C17 4.6 15.7 4 14.8 4c-.5 0-.9.3-1 .8l-1.2 5.2c-.1.5-.5 1-1 1.3L9 12v8h8.3c.8 0 1.5-.5 1.8-1.2l2.1-5.3c.5-1.3-.5-2.5-1.9-2.5H21Zm-18 2h3v8H3v-8Z"
                fill="currentColor"
              />
            </g>
          </svg>
        </span>
      )}
    </div>
  );
}
