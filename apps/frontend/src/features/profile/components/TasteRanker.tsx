"use client";

import type { TasteKind } from "../store/tasteStore";

type Props = {
  kind: TasteKind;
  title: string;
  kicker: string;
  items: string[];
  onMove: (kind: TasteKind, index: number, direction: -1 | 1) => void;
  onReset: (kind: TasteKind) => void;
};

export function TasteRanker({
  kind,
  title,
  kicker,
  items,
  onMove,
  onReset,
}: Props) {
  return (
    <div className="taste-ranker">
      <div className="taste-ranker__head">
        <div>
          <p className="trend-kicker">{kicker}</p>
          <h3>{title}</h3>
        </div>
        <button
          type="button"
          className="taste-ranker__reset"
          onClick={() => onReset(kind)}
        >
          Скинути
        </button>
      </div>
      <ol className="taste-ranker__list">
        {items.map((item, index) => {
          const strength = ((items.length - index) / items.length) * 100;
          return (
            <li key={item} className="taste-row">
              <span className="taste-row__rank">{index + 1}</span>
              <div className="taste-row__body">
                <span className="taste-row__name">{item}</span>
                <span className="taste-row__meter" aria-hidden="true">
                  <span
                    className="taste-row__fill"
                    style={{ width: `${strength}%` }}
                  />
                </span>
              </div>
              <div className="taste-row__actions">
                <button
                  type="button"
                  aria-label="Підняти"
                  disabled={index === 0}
                  onClick={() => onMove(kind, index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Опустити"
                  disabled={index === items.length - 1}
                  onClick={() => onMove(kind, index, 1)}
                >
                  ↓
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
