"use client";

import { useEffect, useMemo, useState } from "react";
import type { ListType } from "../lib/releases";
import { copy } from "../../lib/strings";

type Props = {
  isOpen: boolean;
  selected: ListType[];
  onClose: () => void;
  onSave: (next: ListType[]) => void;
};

const DEFAULT_LISTS: { type: ListType; label: string }[] = [
  { type: "follow", label: copy.lists?.follow ?? "Підписка" },
  { type: "watchlist", label: copy.lists?.watchlist ?? "Want to watch" },
  { type: "favorite", label: copy.lists?.favorite ?? "Favorites" },
];

export function ListPickerModal({ isOpen, selected, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<ListType[]>([]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setDraft(selected);
  }, [isOpen, selected]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

  const items = useMemo(() => DEFAULT_LISTS, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="list-modal">
      <button type="button" className="list-modal__overlay" onClick={onClose} />
      <div className="list-modal__card" role="dialog" aria-modal="true">
        <div className="list-modal__head">
          <h3>{copy.actions.addToList}</h3>
          <button type="button" className="list-modal__close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="list-modal__options">
          {items.map((item) => {
            const active = draft.includes(item.type);
            return (
              <button
                key={item.type}
                type="button"
                className={`list-modal__option${active ? " active" : ""}`}
                onClick={() => {
                  setDraft((prev) =>
                    prev.includes(item.type)
                      ? prev.filter((entry) => entry !== item.type)
                      : [...prev, item.type]
                  );
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="list-modal__actions">
          <button type="button" className="secondary" onClick={onClose}>
            {copy.auth.closeLabel}
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => onSave(draft)}
          >
            {copy.actions.added}
          </button>
        </div>
      </div>
    </div>
  );
}
