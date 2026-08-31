"use client";

export type StatItem = {
  key: string;
  value: number | string;
  label: string;
  /** A clickable tile applies a filter; the rest are plain readouts. */
  onClick?: () => void;
  isActive?: boolean;
  hint?: string;
};

type Props = {
  items: StatItem[];
  isLoading?: boolean;
};

/**
 * Five counters in one tone. The old tiles used five different colours, which
 * read as five different states rather than as five homogeneous numbers.
 */
export function StatRow({ items, isLoading = false }: Props) {
  return (
    <div className="stat-row">
      {items.map((item) =>
        item.onClick ? (
          <button
            key={item.key}
            type="button"
            className={`stat-tile stat-tile--action${item.isActive ? " is-active" : ""}`}
            onClick={item.onClick}
            aria-pressed={item.isActive}
            title={item.hint}
          >
            <strong>{isLoading ? "…" : item.value}</strong>
            <span>{item.label}</span>
          </button>
        ) : (
          <div key={item.key} className="stat-tile">
            <strong>{isLoading ? "…" : item.value}</strong>
            <span>{item.label}</span>
          </div>
        )
      )}
    </div>
  );
}
