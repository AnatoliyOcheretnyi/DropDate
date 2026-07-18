"use client";

import { useState } from "react";
import type { MoodPick } from "../api/mood";
import type { ListType } from "../../../shared/types/releases";
import { PickCard } from "../../../shared/ui/PickCard";
import { ListPickerModal } from "../../../widgets/ListPickerModal";

type Props = {
  picks: MoodPick[];
  onMore: () => void;
  onReset: () => void;
  onDetails: (pick: MoodPick) => void;
  getListTypes: (pick: MoodPick) => ListType[];
  onListChange: (pick: MoodPick, listTypes: ListType[]) => void;
  onDismiss: (pick: MoodPick) => void;
  onLike: (pick: MoodPick) => void;
};

export function MoodResults({
  picks,
  onMore,
  onReset,
  onDetails,
  getListTypes,
  onListChange,
  onDismiss,
  onLike,
}: Props) {
  const [openPickerId, setOpenPickerId] = useState<number | null>(null);

  return (
    <div className="mood-results">
      <div className="mood-results-head">
        <h2>Ось що підібрали</h2>
        <p>Наведи на ⓘ, щоб прочитати опис.</p>
      </div>

      <div className="mood-grid">
        {picks.map((pick) => {
          const lists = getListTypes(pick);
          return (
            <PickCard
              key={pick.tmdbId}
              item={pick}
              onDetails={() => onDetails(pick)}
              meta={
                <>
                  {pick.year ? <span>{pick.year}</span> : null}
                  {pick.reason ? (
                    <span className="mood-card-reason">{pick.reason}</span>
                  ) : null}
                </>
              }
              secondaryAction={
                <div className="mood-card-feedback">
                  <button type="button" className="mood-card-feedback__like" onClick={()=>onLike(pick)}>Більше схожого</button>
                  <button
                    type="button"
                    className="mood-card-feedback__dismiss"
                    onClick={() => onDismiss(pick)}
                  >
                    Не моє
                  </button>
                <div className="list-picker mood-card-picker">
                  <button
                    type="button"
                    className={`list-picker__button list-picker__button--compact${
                      lists.length > 0 ? " is-active" : ""
                    }`}
                    onClick={() =>
                      setOpenPickerId((current) =>
                        current === pick.tmdbId ? null : pick.tmdbId
                      )
                    }
                  >
                    {lists.length > 0 ? (
                      <>
                        <span className="list-picker__check">✓</span>
                        <span>Списки · {lists.length}</span>
                      </>
                    ) : (
                      <span>+ У список</span>
                    )}
                  </button>
                  <ListPickerModal
                    isOpen={openPickerId === pick.tmdbId}
                    selected={lists}
                    onClose={() => setOpenPickerId(null)}
                    onChange={(next) => onListChange(pick, next)}
                  />
                </div>
                </div>
              }
            />
          );
        })}
      </div>

      <div className="mood-results-actions">
        <button type="button" className="primary" onClick={onMore}>
          Ще варіанти
        </button>
        <button type="button" onClick={onReset}>
          Спочатку
        </button>
      </div>
    </div>
  );
}
