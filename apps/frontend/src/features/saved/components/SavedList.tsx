"use client";

import type { SavedRelease } from "../../../../app/lib/releases";
import { getReleaseStatusLabel, type Suggestion } from "../../../../lib/release";
import { copy } from "../../../../lib/strings";
import { useRouter } from "next/navigation";

type Props = {
  items: SavedRelease[];
  onRemove: (item: SavedRelease) => void;
  actionsDisabled?: boolean;
  groupByDate?: boolean;
};

const formatDate = (value?: string) => {
  if (!value) {
    return copy.misc.dash;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
  }).format(parsed);
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

  if (date < endToday) {
    return "today";
  }
  if (date < endWeek) {
    return "week";
  }
  if (date < endMonth) {
    return "month";
  }
  return "later";
};

const SECTION_TITLES: Record<string, string> = copy.saved.sectionTitles;

const SECTION_ORDER = ["today", "week", "month", "later", "ended", "unknown"] as const;

export function SavedList({ items, onRemove, actionsDisabled, groupByDate = true }: Props) {
  const router = useRouter();
  const buckets = groupByDate
    ? items.reduce<Record<string, SavedRelease[]>>((acc, item) => {
        const key = getBucketKey(item);
        acc[key] = acc[key] ? [...acc[key], item] : [item];
        return acc;
      }, {})
    : {};

  const renderCard = (item: SavedRelease) => {
    const statusLabel = getReleaseStatusLabel(item.status, item.type);
    const imageUrl = item.posterUrl || item.backdropUrl;
    const mediaType: Suggestion["mediaType"] =
      item.mediaType || (item.type === "movie" ? "movie" : "tv");

    return (
      <div key={item.id} className="saved-card">
        <button
          type="button"
          className="saved-remove"
          onClick={() => onRemove(item)}
          disabled={actionsDisabled}
          aria-label={copy.saved.removeAria}
        >
          ✕
        </button>
        <button
          type="button"
          className="saved-card-link"
          onClick={() => {
            if (item.tmdbId) {
              router.push(`/title/${mediaType}/${item.tmdbId}`);
            } else {
              router.push(`/search?query=${encodeURIComponent(item.title)}`);
            }
          }}
        >
          <div className="saved-card-media">
            {imageUrl ? (
              <img src={imageUrl} alt={item.title} loading="lazy" />
            ) : (
              <div className="poster-card-fallback">{item.title.slice(0, 1)}</div>
            )}
          </div>
          <div className="saved-card-overlay" aria-hidden="true">
            <span className="saved-card-status">{statusLabel}</span>
            <h4>{item.title}</h4>
            <p>{formatDate(item.nextRelease)}</p>
          </div>
        </button>
      </div>
    );
  };

  if (!groupByDate) {
    const gridClass = `saved-grid${
      items.length === 1 ? " saved-grid--single" : items.length === 2 ? " saved-grid--double" : ""
    }`;
    return <div className={gridClass}>{items.map(renderCard)}</div>;
  }

  return (
    <div className="saved-sections">
      {SECTION_ORDER.map((key) => {
        const sectionItems = buckets[key] || [];
        if (sectionItems.length === 0) {
          return null;
        }

        const gridClass = `saved-grid${
          sectionItems.length === 1
            ? " saved-grid--single"
            : sectionItems.length === 2
              ? " saved-grid--double"
              : ""
        }`;
        return (
          <section key={key} className="saved-section">
            <div className="saved-section-head">
              <h3>{SECTION_TITLES[key]}</h3>
            </div>
            <div className={gridClass}>{sectionItems.map(renderCard)}</div>
          </section>
        );
      })}
    </div>
  );
}
