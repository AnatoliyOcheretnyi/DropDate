"use client";

import type { ListType, SavedRelease } from "../../../shared/types/releases";
import { copy } from "../../../shared/lib/strings";
import type { SavedViewMode } from "../types";
import { SavedCompactRow } from "./SavedCompactRow";
import { SavedPosterCard } from "./SavedPosterCard";

type Props = {
  items: SavedRelease[];
  onRemove: (item: SavedRelease) => void;
  actionsDisabled?: boolean;
  /** Date sections only make sense while the list is ordered by release date. */
  groupByDate?: boolean;
  onChangeLists?: (item: SavedRelease, next: ListType[]) => void;
  onRate?: (item: SavedRelease, rating: number) => void;
  showBadges?: boolean;
  view?: SavedViewMode;
};

const isEnded = (item: SavedRelease) =>
  item.status === "ended" || item.status === "released";

const getBucketKey = (item: SavedRelease) => {
  if (isEnded(item)) {
    return "ended";
  }
  if (!item.nextRelease) {
    return "unknown";
  }
  const date = new Date(item.nextRelease);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);
  const endWeek = new Date(startToday);
  endWeek.setDate(endWeek.getDate() + 7);
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  if (date < startToday) {
    return "ended";
  }
  if (date >= startToday && date < endToday) {
    return "today";
  }
  if (date >= endToday && date < endWeek) {
    return "week";
  }
  if (date >= endWeek && date < endMonth) {
    return "month";
  }
  return "later";
};

const SECTION_TITLES: Record<string, string> = copy.saved.sectionTitles;

const SECTION_ORDER = ["today", "week", "month", "later", "ended", "unknown"] as const;

export function AuthorizedSavedList({
  items,
  onRemove,
  actionsDisabled,
  groupByDate = false,
  onChangeLists,
  onRate,
  showBadges = false,
  view = "grid",
}: Props) {
  const renderItem = (item: SavedRelease) =>
    view === "compact" ? (
      <SavedCompactRow
        key={item.id}
        item={item}
        onRemove={onRemove}
        onChangeLists={onChangeLists}
        showBadges={showBadges}
        actionsDisabled={actionsDisabled}
      />
    ) : (
      <SavedPosterCard
        key={item.id}
        item={item}
        onRemove={onRemove}
        onChangeLists={onChangeLists}
        onRate={onRate}
        showBadges={showBadges}
        actionsDisabled={actionsDisabled}
      />
    );

  const containerClass = view === "compact" ? "saved-rows" : "saved-grid";

  if (!groupByDate) {
    return <div className={containerClass}>{items.map(renderItem)}</div>;
  }

  const buckets = items.reduce<Record<string, SavedRelease[]>>((acc, item) => {
    const key = getBucketKey(item);
    acc[key] = acc[key] ? [...acc[key], item] : [item];
    return acc;
  }, {});

  return (
    <div className="saved-sections">
      {SECTION_ORDER.map((key) => {
        const sectionItems = buckets[key] || [];
        if (sectionItems.length === 0) {
          return null;
        }
        return (
          <section key={key} className="saved-section">
            <div className="saved-section-head">
              <h3>{SECTION_TITLES[key]}</h3>
              <span>{sectionItems.length}</span>
            </div>
            <div className={containerClass}>{sectionItems.map(renderItem)}</div>
          </section>
        );
      })}
    </div>
  );
}
