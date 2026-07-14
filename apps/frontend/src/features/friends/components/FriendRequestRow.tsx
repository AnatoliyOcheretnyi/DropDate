"use client";

import { FriendAvatar } from "./FriendAvatar";
import type { Friendship } from "../../../shared/types/friends";

type Props = {
  friendship: Friendship;
  direction: "incoming" | "outgoing";
  onAccept?: (friendshipId: string) => void;
  onDecline?: (friendshipId: string) => void;
  onCancel?: (friendshipId: string) => void;
  isBusy?: boolean;
};

export function FriendRequestRow({
  friendship,
  direction,
  onAccept,
  onDecline,
  onCancel,
  isBusy,
}: Props) {
  const label = friendship.user.username || friendship.user.email;

  return (
    <div className="friend-request-row">
      <FriendAvatar label={label} size="sm" />
      <div className="friend-request-row__meta">
        <strong>@{friendship.user.username || "без юзернейму"}</strong>
        <span>{friendship.user.email}</span>
      </div>
      {direction === "incoming" ? (
        <div className="friend-request-row__actions">
          <button
            type="button"
            className="btn-pill btn-pill--accent"
            disabled={isBusy}
            onClick={() => onAccept?.(friendship.id)}
          >
            Прийняти
          </button>
          <button
            type="button"
            className="btn-pill btn-pill--ghost"
            disabled={isBusy}
            onClick={() => onDecline?.(friendship.id)}
          >
            Відхилити
          </button>
        </div>
      ) : (
        <div className="friend-request-row__actions">
          <span className="btn-pill btn-pill--pending">Очікує</span>
          <button
            type="button"
            className="btn-pill btn-pill--ghost"
            disabled={isBusy}
            onClick={() => onCancel?.(friendship.id)}
          >
            Скасувати
          </button>
        </div>
      )}
    </div>
  );
}
