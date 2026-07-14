"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { FriendAvatar, friendHue } from "./FriendAvatar";
import type { Friendship } from "../../../shared/types/friends";

type Props = {
  friendship: Friendship;
  onRemove: (friendshipId: string) => void;
};

const POSTER_SLOTS = 4;

const formatSince = (value?: string) => {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("uk-UA", { month: "short", year: "numeric" }).format(parsed);
};

export function FriendCard({ friendship, onRemove }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const label = friendship.user.username || friendship.user.email;
  const hue = useMemo(() => friendHue(label), [label]);
  const since = formatSince(friendship.respondedAt);
  const posters = friendship.recentPosters ?? [];
  const mutual = friendship.mutualTitles ?? 0;

  // A stray click shouldn't unfriend: first click arms the button, and it
  // disarms itself if the second click doesn't come quickly.
  useEffect(() => {
    if (!confirming) {
      return;
    }
    const timer = setTimeout(() => setConfirming(false), 2600);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <div className="friend-card">
      <button
        type="button"
        className="friend-card__link"
        onClick={() => router.push(`/friends/${friendship.user.id}`)}
      >
        <div className="friend-card__posters">
          {Array.from({ length: POSTER_SLOTS }).map((_, index) => {
            const poster = posters[index];
            return poster ? (
              <div key={index} className="friend-card__poster">
                <CoverImage src={poster} alt="" sizes="160px" ariaHidden />
              </div>
            ) : (
              <span
                key={index}
                className="friend-card__poster friend-card__poster--empty"
                style={{ filter: `hue-rotate(${hue}deg)` }}
                aria-hidden="true"
              />
            );
          })}
          <div className="friend-card__posters-fade" aria-hidden="true" />
        </div>

        <div className="friend-card__body">
          <FriendAvatar label={label} size="lg" />
          <div className="friend-card__id">
            <strong>@{friendship.user.username || "без юзернейму"}</strong>
            <span className="friend-card__email">{friendship.user.email}</span>
          </div>
          <div className="friend-card__meta">
            <span>
              <b>{friendship.savedTitles ?? 0}</b> тайтлів
            </span>
            {mutual > 0 ? (
              <span className="friend-card__mutual">
                <b>{mutual}</b> спільних
              </span>
            ) : null}
            {since ? <span>з {since}</span> : null}
          </div>
          <span className="friend-card__open">Профіль →</span>
        </div>
      </button>
      <button
        type="button"
        className={`friend-card__remove${confirming ? " is-confirming" : ""}`}
        onClick={() => {
          if (confirming) {
            onRemove(friendship.id);
            return;
          }
          setConfirming(true);
        }}
        aria-label={confirming ? "Підтвердити видалення з друзів" : "Прибрати з друзів"}
      >
        {confirming ? "Точно?" : "✕"}
      </button>
    </div>
  );
}
