"use client";

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
        Пошук
      </button>
      <button
        type="button"
        className={active === "saved" ? "active" : ""}
        onClick={() => onChange("saved")}
      >
        Мій список ({savedCount})
      </button>
    </nav>
  );
}
