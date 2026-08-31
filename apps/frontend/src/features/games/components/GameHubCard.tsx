"use client";

import type { CSSProperties } from "react";
import { CoverImage } from "../../../shared/ui/CoverImage";

type Props = {
  emoji: string;
  title: string;
  description: string;
  /** "Рекорд 8/10", "У колі: 12" or the nudge for a game never played. */
  meta: string;
  isRecord: boolean;
  accentA: string;
  posters: string[];
  onClick: () => void;
};

/**
 * The card is mostly image now: three posters from the game's own pool under a
 * tinted gradient. Before this it was an emoji on a flat gradient — the only
 * surface in the app that showed no film at all.
 */
export function GameHubCard({
  emoji,
  title,
  description,
  meta,
  isRecord,
  accentA,
  posters,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      className="game-hub-card"
      style={{ "--ga": accentA } as CSSProperties}
      onClick={onClick}
    >
      <span className="game-hub-card__mosaic" aria-hidden="true">
        {[0, 1, 2].map((slot) => (
          <span key={slot} className="game-hub-card__slot">
            {posters[slot] ? (
              <CoverImage src={posters[slot]} alt="" sizes="150px" ariaHidden />
            ) : null}
          </span>
        ))}
      </span>
      <span className="game-hub-card__tint" aria-hidden="true" />

      <span className="game-hub-card__chip" aria-hidden="true">
        {emoji}
      </span>
      <span className={`game-hub-card__meta${isRecord ? " is-record" : ""}`}>{meta}</span>

      <span className="game-hub-card__body">
        <strong>{title}</strong>
        <span className="game-hub-card__desc">{description}</span>
        <span className="game-hub-card__cta">Грати →</span>
      </span>
    </button>
  );
}
