"use client";

import type { SavedRelease } from "../lib/releases";
import { getReleaseStatusLabel } from "../../lib/release";
import { ReleaseDetails } from "./ReleaseDetails";

type Props = {
  items: SavedRelease[];
  onRemove: (id: string) => void;
  actionsDisabled?: boolean;
};

export function SavedList({ items, onRemove, actionsDisabled }: Props) {
  return (
    <ul className="saved-list">
      {items.map((item) => (
        <li key={item.id}>
          <article className="card compact">
            <div className="card-head">
              <p className="card-label">{getReleaseStatusLabel(item.status, item.type)}</p>
              <button
                type="button"
                className="secondary danger"
                onClick={() => onRemove(item.id)}
                disabled={actionsDisabled}
              >
                Прибрати
              </button>
            </div>
            <div
              className={`card-hero${item.backdropUrl || item.posterUrl ? "" : " placeholder"}`}
            >
              {item.backdropUrl || item.posterUrl ? (
                <img src={item.backdropUrl || item.posterUrl} alt={item.title} loading="lazy" />
              ) : (
                <span>{item.title.slice(0, 1)}</span>
              )}
            </div>
            <div className="card-details">
              <h2>{item.title}</h2>
              <ReleaseDetails release={item} />
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
