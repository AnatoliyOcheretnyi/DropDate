"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ListType } from "../shared/types/releases";
import { copy } from "../shared/lib/strings";

type Props = {
  isOpen: boolean;
  selected: ListType[];
  onClose: () => void;
  onChange: (next: ListType[]) => void;
};

const DEFAULT_LISTS: { type: ListType; label: string }[] = [
  { type: "follow", label: copy.lists?.follow ?? "Підписка" },
  { type: "watchlist", label: copy.lists?.watchlist ?? "Хочу подивитись" },
  { type: "favorite", label: copy.lists?.favorite ?? "Улюблене" },
  { type: "watched", label: copy.lists?.watched ?? "Переглянуто" },
  { type: "disliked", label: copy.lists?.disliked ?? "Не сподобалось" },
];

const STATUS_LISTS: ListType[] = ["favorite", "watched", "disliked"];

export function ListPickerModal({
  isOpen,
  selected,
  onClose,
  onChange,
}: Props) {
  const [draft, setDraft] = useState<ListType[]>([]);
  const cardRef = useRef<HTMLDivElement | null>(null);

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
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const handleClick = (event: MouseEvent) => {
      if (!cardRef.current) {
        return;
      }
      if (!cardRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isOpen, onClose]);

  const items = useMemo(() => DEFAULT_LISTS, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="list-popover" role="dialog" aria-modal="false">
      <div className="list-popover__card" ref={cardRef}>
        <div className="list-popover__head">{copy.actions.addToList}</div>
        <div className="list-popover__options">
          {items.map((item) => {
            const active = draft.includes(item.type);
            return (
              <button
                key={item.type}
                type="button"
                className={`list-popover__option${active ? " active" : ""}`}
                onClick={() => {
                  const next = active
                    ? draft.filter((entry) => entry !== item.type)
                    : [
                        ...draft.filter(
                          (entry) =>
                            !STATUS_LISTS.includes(item.type) ||
                            !STATUS_LISTS.includes(entry)
                        ),
                        item.type,
                      ];
                  setDraft(next);
                  onChange(next);
                }}
              >
                <span className="list-popover__check" aria-hidden="true" />
                <span className="list-popover__label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
