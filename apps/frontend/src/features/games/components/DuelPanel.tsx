"use client";

import { useState } from "react";
import { FriendAvatar } from "../../friends/components/FriendAvatar";
import type { Friendship } from "../../../shared/types/friends";

export type IncomingChallenge = {
  id: string;
  gameId: string;
  seed: number;
  fromLabel: string;
};

const GAMES: { id: string; label: string }[] = [
  { id: "release_date", label: "Дати релізу" },
  { id: "rating", label: "Рейтинги" },
];

type Props = {
  friends: Friendship[];
  incoming: IncomingChallenge[];
  isCreating: boolean;
  createdLink: string | null;
  onCreate: (opponentId: string, gameId: string) => void;
  onOpen: (href: string) => void;
};

/**
 * Two bare `<select>`s and an unstyled button became a two-step picker: who,
 * then which game. The incoming challenges sit beside it instead of being
 * rendered with the daily challenge's own class.
 */
export function DuelPanel({
  friends,
  incoming,
  isCreating,
  createdLink,
  onCreate,
  onOpen,
}: Props) {
  const [opponent, setOpponent] = useState("");
  const [gameId, setGameId] = useState(GAMES[0].id);

  return (
    <section className="duel">
      <div className="duel__builder">
        <div className="duel__head">
          <p className="eyebrow">Дуель із другом</p>
          <h2>Однакові питання. Різні результати.</h2>
        </div>

        <p className="duel__step">1 · Обери суперника</p>
        <div className="duel__friends">
          {friends.map((entry) => {
            const label = entry.user.username || entry.user.email;
            const isActive = opponent === entry.user.id;
            return (
              <button
                key={entry.user.id}
                type="button"
                className={`duel__friend${isActive ? " is-active" : ""}`}
                aria-pressed={isActive}
                onClick={() => setOpponent(entry.user.id)}
              >
                <FriendAvatar label={label} />
                <span>@{entry.user.username || "без юзернейму"}</span>
              </button>
            );
          })}
        </div>

        <p className="duel__step">2 · Обери гру</p>
        <div className="duel__games">
          {GAMES.map((game) => (
            <button
              key={game.id}
              type="button"
              className={`duel__chip${gameId === game.id ? " is-active" : ""}`}
              aria-pressed={gameId === game.id}
              onClick={() => setGameId(game.id)}
            >
              {game.label}
            </button>
          ))}
        </div>

        <div className="duel__actions">
          <button
            type="button"
            className="primary"
            disabled={!opponent || isCreating}
            onClick={() => onCreate(opponent, gameId)}
          >
            {isCreating ? "Створюю…" : "Створити виклик →"}
          </button>
          {createdLink ? (
            <button type="button" onClick={() => onOpen(createdLink)}>
              Грати свій раунд →
            </button>
          ) : null}
        </div>
      </div>

      <div className="duel__incoming">
        <h3>Тебе викликали</h3>
        {incoming.length === 0 ? (
          <p className="duel__empty">Викликів немає — створи перший.</p>
        ) : (
          incoming.map((item) => (
            <button
              key={item.id}
              type="button"
              className="duel__challenge"
              onClick={() =>
                onOpen(
                  `/games/battle?mode=${item.gameId}&challenge=${item.id}&seed=${item.seed}`
                )
              }
            >
              <FriendAvatar label={item.fromLabel} />
              <span className="duel__challenge-text">
                <strong>@{item.fromLabel} чекає на твій раунд</strong>
                <span>
                  {GAMES.find((game) => game.id === item.gameId)?.label ?? item.gameId}
                </span>
              </span>
              <span className="duel__challenge-cta">Зіграти →</span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
