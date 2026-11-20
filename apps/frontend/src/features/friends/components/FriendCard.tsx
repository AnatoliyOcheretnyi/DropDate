"use client";

import Link from "next/link";
import { useState } from "react";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { FriendAvatar, friendHue } from "./FriendAvatar";
import type { Friendship } from "../../../shared/types/friends";

type Props = {
  friendship: Friendship;
  onRemove: (friendshipId: string) => Promise<unknown>;
};
export function FriendCard({ friendship, onRemove }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const label = friendship.user.username
    ? `@${friendship.user.username}`
    : friendship.user.email;
  const posters = friendship.recentPosters ?? [];
  const since = friendship.respondedAt
    ? new Date(friendship.respondedAt)
    : null;
  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await onRemove(friendship.id);
    } catch {
      setError("Не вдалося прибрати друга. Спробуй ще раз.");
      setBusy(false);
    }
  };
  return (
    <article className="friend-card">
      <Link
        href={`/friends/${friendship.user.id}`}
        className="friend-card__link"
        aria-label={`Відкрити профіль ${label}`}
      >
        <div className="friend-card__posters">
          {[0, 1, 2, 3].map((index) =>
            posters[index] ? (
              <div className="friend-card__poster" key={index}>
                <CoverImage
                  src={posters[index]}
                  alt=""
                  sizes="(max-width: 600px) 25vw, 100px"
                  ariaHidden
                />
              </div>
            ) : (
              <span
                key={index}
                className="friend-card__poster friend-card__poster--empty"
                style={{ filter: `hue-rotate(${friendHue(label)}deg)` }}
              />
            ),
          )}
          <div className="friend-card__posters-fade" aria-hidden="true" />
          {(friendship.mutualTitles ?? 0) > 0 && (
            <span className="friend-card__connection">
              <span aria-hidden="true">✦</span> Є спільне кіно
            </span>
          )}
        </div>
        <div className="friend-card__body">
          <FriendAvatar
            label={friendship.user.username || friendship.user.email}
            size="lg"
          />
          <div className="friend-card__id">
            <strong>{label}</strong>
            <span className="friend-card__email">
              {friendship.user.username
                ? friendship.user.email
                : "Твій друг у DropDate"}
            </span>
          </div>
          <div className="friend-card__numbers">
            <div>
              <strong>{friendship.savedTitles ?? 0}</strong>
              <span>у списку</span>
            </div>
            <div>
              <strong>{friendship.mutualTitles ?? 0}</strong>
              <span>спільних тайтлів</span>
            </div>
          </div>
          <span className="friend-card__open">
            Зазирнути у список <span aria-hidden="true">↗</span>
          </span>
        </div>
      </Link>
      <div className="friend-card__footer">
        {confirming ? (
          <div className="friend-card__confirm">
            <p>Прибрати {label} з друзів?</p>
            <div>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setConfirming(false);
                  setError("");
                }}
              >
                Залишити
              </button>
              <button
                type="button"
                className="friend-card__danger"
                disabled={busy}
                onClick={() => void remove()}
              >
                {busy ? "Прибираємо…" : "Так, прибрати"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <span>
              {since && !Number.isNaN(since.getTime())
                ? `Разом із ${new Intl.DateTimeFormat("uk-UA", { month: "short", year: "numeric" }).format(since)}`
                : "У твоєму кіноколі"}
            </span>
            <button
              type="button"
              aria-label={`Прибрати ${label} з друзів`}
              onClick={() => setConfirming(true)}
            >
              Прибрати
            </button>
          </>
        )}
        {error && (
          <p className="friend-card__error" role="alert">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
