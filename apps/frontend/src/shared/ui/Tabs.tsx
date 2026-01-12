"use client";

import { copy } from "../lib/strings";

type TabKey = "search" | "saved";

type Props = {
  active: TabKey;
  savedCount: number;
  onChange: (tab: TabKey) => void;
};

export function Tabs({ active, savedCount, onChange }: Props) {
  return (
    <nav className="tabs">
      <button
        type="button"
        className={active === "search" ? "active" : ""}
        onClick={() => onChange("search")}
      >
        {copy.sections.search}
      </button>
      <button
        type="button"
        className={active === "saved" ? "active" : ""}
        onClick={() => onChange("saved")}
      >
        {copy.header.savedList} ({savedCount})
      </button>
    </nav>
  );
}
