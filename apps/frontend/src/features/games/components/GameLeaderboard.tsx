"use client";

import { FriendAvatar } from "../../friends/components/FriendAvatar";

export type LeaderRow = {
  userId: string;
  name: string;
  score: number;
  plays: number;
};

type Props = {
  rows: LeaderRow[];
  currentUserId?: string;
  isLoading?: boolean;
};

/**
 * A bare `<ol>` before: no avatars, and no way to spot yourself in it.
 */
export function GameLeaderboard({ rows, currentUserId, isLoading = false }: Props) {
  const top = rows.slice(0, 5);
  const myIndex = rows.findIndex((row) => row.userId === currentUserId);
  const isOutsideTop = myIndex >= top.length;

  return (
    <section className="leaderboard">
      <div className="leaderboard__head">
        <h3>Топ тижня</h3>
        <span>Оновлюється щопонеділка</span>
      </div>

      {isLoading ? (
        <div className="leaderboard__rows">
          {[0, 1, 2].map((key) => (
            <span key={key} className="leaderboard__row is-loading" aria-hidden="true" />
          ))}
        </div>
      ) : top.length === 0 ? (
        <p className="leaderboard__empty">
          Тут зʼявиться топ, щойно хтось зіграє цього тижня.
        </p>
      ) : (
        <div className="leaderboard__rows">
          {top.map((row, index) => {
            const isMe = row.userId === currentUserId;
            return (
              <div
                key={row.userId}
                className={`leaderboard__row${isMe ? " is-me" : ""}`}
              >
                <b className="leaderboard__place">{index + 1}</b>
                <FriendAvatar label={row.name} size="sm" />
                <span className="leaderboard__name">
                  {row.name}
                  {isMe ? " · це ти" : ""}
                </span>
                <strong className="leaderboard__score">{row.score}</strong>
              </div>
            );
          })}
        </div>
      )}

      {isOutsideTop && myIndex >= 0 ? (
        <p className="leaderboard__mine">Твоє місце: {myIndex + 1}</p>
      ) : null}
    </section>
  );
}
