"use client";

import { useState } from "react";
import type { TasteKind } from "../store/tasteStore";

type Props = {
  kind: TasteKind;
  title: string;
  kicker: string;
  items: string[];
  onReorder: (kind: TasteKind, from: number, to: number) => void;
  onReset: (kind: TasteKind) => void;
};

export function TasteRanker({
  kind,
  title,
  kicker,
  items,
  onReorder,
  onReset,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const finishDrop = (to: number) => {
    if (dragIndex !== null && dragIndex !== to) {
      onReorder(kind, dragIndex, to);
    }
    setDragIndex(null);
    setOverIndex(null);
  };

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
          const isDragging = dragIndex === index;
          const isOver = overIndex === index && dragIndex !== index;
          return (
            <li
              key={item}
              className={`taste-row${isDragging ? " is-dragging" : ""}${
                isOver ? " is-over" : ""
              }`}
              draggable
              onDragStart={(event) => {
                setDragIndex(index);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(index));
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (overIndex !== index) {
                  setOverIndex(index);
                }
              }}
              onDragLeave={() => {
                if (overIndex === index) {
                  setOverIndex(null);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                finishDrop(index);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
            >
              <span className="taste-row__handle" aria-hidden="true">
                ⠿
              </span>
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
            </li>
          );
        })}
      </ol>
    </div>
  );
}
