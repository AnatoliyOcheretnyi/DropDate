"use client";

import type { GameMode, GameTitleCard } from "../api/games";

type CardState = "idle" | "correct" | "wrong";

type Props = {
  card: GameTitleCard;
  mode: GameMode;
  state: CardState;
  isRevealed: boolean;
  disabled: boolean;
  isSaved: boolean;
  onSelect: () => void;
  onDetails: () => void;
  onSave: () => void;
};

const dateFormatter = new Intl.DateTimeFormat("uk-UA", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const formatFullDate = (value?: string) => {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return dateFormatter.format(parsed);
};

const formatMetric = (card: GameTitleCard, mode: GameMode) => {
  if (mode === "rating") {
    return typeof card.rating === "number" ? `★ ${card.rating.toFixed(1)}` : "—";
  }
  return formatFullDate(card.releaseDate) || card.year || "—";
};

export function GameQuestionCard({
  card,
  mode,
  state,
  isRevealed,
  disabled,
  isSaved,
  onSelect,
  onDetails,
  onSave,
}: Props) {
  return (
    <div className={`game-card game-card--${state}`}>
      <button
        type="button"
        className="game-card__pick"
        onClick={onSelect}
        disabled={disabled}
        aria-label={card.title}
      >
        <div className="game-card__media">
          {card.posterUrl ? (
            <img src={card.posterUrl} alt={card.title} loading="lazy" />
          ) : (
            <div className="game-card__fallback">{card.title.slice(0, 1)}</div>
          )}
          {isRevealed ? (
            <span className="game-card__metric">{formatMetric(card, mode)}</span>
          ) : null}
        </div>
        <div className="game-card__content">
          <strong className="game-card__title">{card.title}</strong>
          {isRevealed && card.year ? (
            <span className="game-card__year">{card.year}</span>
          ) : null}
        </div>
      </button>

      {isRevealed ? (
        <div className="game-card__actions">
          <button type="button" className="game-card__action" onClick={onDetails}>
            Деталі
          </button>
          <button
            type="button"
            className={`game-card__action${isSaved ? " is-saved" : ""}`}
            onClick={onSave}
          >
            {isSaved ? "У списку" : "Зберегти"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
