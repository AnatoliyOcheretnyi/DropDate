"use client";

import type { ListType } from "../types/releases";
import { LIST_META, toggleListType } from "../lib/listMeta";

type Props = {
  selected: ListType[];
  onChange: (next: ListType[]) => void;
  variant?: "full" | "compact";
};

export function ListStatusBar({ selected, onChange, variant = "full" }: Props) {
  return (
    <div
      className={`list-status-bar list-status-bar--${variant}`}
      role="group"
      aria-label="Списки"
    >
      {LIST_META.map((item) => {
        const active = selected.includes(item.type);
        return (
          <button
            key={item.type}
            type="button"
            data-list={item.type}
            className={`list-status${active ? " is-active" : ""}`}
            aria-pressed={active}
            title={item.label}
            onClick={() => onChange(toggleListType(selected, item.type))}
          >
            <span className="list-status__icon">{item.icon}</span>
            <span className="list-status__label">{item.label}</span>
            <span className="list-status__check" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </button>
        );
      })}
    </div>
  );
}
