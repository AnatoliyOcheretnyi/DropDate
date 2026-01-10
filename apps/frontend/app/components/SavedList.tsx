"use client";

import type { SavedRelease } from "../lib/releases";
import { getReleaseStatusLabel, type Suggestion } from "../../lib/release";
import { copy } from "../../lib/strings";
import { useRouter } from "next/navigation";

type Props = {
  items: SavedRelease[];
  onRemove: (item: SavedRelease) => void;
  actionsDisabled?: boolean;
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

export function SavedList({ items, onRemove, actionsDisabled }: Props) {
  const router = useRouter();
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
            </div>
            <div className="saved-carousel">
              <div className="saved-track">
                {sectionItems.map((item) => {
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
                            <div className="poster-card-fallback">
                              {item.title.slice(0, 1)}
                            </div>
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
                })}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
