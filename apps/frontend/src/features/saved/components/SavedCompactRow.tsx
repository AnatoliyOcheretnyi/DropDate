"use client";

import { useRouter } from "next/navigation";
import type { ListType, SavedRelease } from "../../../shared/types/releases";
import { copy } from "../../../shared/lib/strings";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { ListBadges } from "../../../shared/ui/ListBadges";
import { MovieInfoButton } from "../../../shared/ui/MovieInfoButton";
import { formatSavedDate, savedMediaType, savedMetaLine } from "../utils/savedPresentation";

type Props = {
  item: SavedRelease;
  onRemove: (item: SavedRelease) => void;
  onChangeLists?: (item: SavedRelease, next: ListType[]) => void;
  showBadges?: boolean;
  actionsDisabled?: boolean;
};

/**
 * Compact row: poster, title, genres, rating, date. A hundred titles fit in a
 * couple of screens instead of an endless scroll of banners.
 */
export function SavedCompactRow({
  item,
  onRemove,
  onChangeLists,
  showBadges = false,
  actionsDisabled,
}: Props) {
  const router = useRouter();
  const mediaType = savedMediaType(item);
  const posterUrl = item.posterUrl || item.backdropUrl;
  const date = formatSavedDate(item.nextRelease);
  const hasOwnRating = typeof item.userRating === "number" && item.userRating > 0;
  const rating = hasOwnRating
    ? String(item.userRating)
    : item.tmdbRating
      ? item.tmdbRating.toFixed(1)
      : null;

  const open = () => {
    if (item.tmdbId) {
      router.push(`/title/${mediaType}/${item.tmdbId}`);
    } else {
      router.push(`/search?query=${encodeURIComponent(item.title)}`);
    }
  };

  return (
    <div className="saved-row">
      <button type="button" className="saved-row-link" onClick={open}>
        <span className="saved-row-poster">
          {posterUrl ? (
            <CoverImage src={posterUrl} alt={item.title} sizes="44px" />
          ) : (
            <span className="saved-card-fallback" aria-hidden="true">
              {item.title.slice(0, 1)}
            </span>
          )}
        </span>
        <span className="saved-row-body">
          <span className="saved-row-title">{item.title}</span>
          <span className="saved-row-meta">{savedMetaLine(item, 3)}</span>
        </span>
      </button>

      {showBadges ? <ListBadges listTypes={item.listTypes ?? []} /> : null}

      {rating ? (
        <span className={`saved-row-rating${hasOwnRating ? " is-mine" : ""}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.9l-5.8 3.05 1.1-6.47-4.7-4.58 6.5-.95L12 2.5Z" />
          </svg>
          {rating}
        </span>
      ) : null}

      <span className="saved-row-date">{date || copy.misc.dash}</span>

      <span className="saved-row-actions">
        {item.tmdbId && onChangeLists ? (
          <MovieInfoButton
            tmdbId={item.tmdbId}
            mediaType={mediaType}
            title={item.title}
            className="saved-card-info"
            onActivate={open}
            activeLists={item.listTypes ?? []}
            onChangeLists={(next) => onChangeLists(item, next)}
          />
        ) : null}
        <button
          type="button"
          className="saved-card-remove"
          onClick={() => onRemove(item)}
          disabled={actionsDisabled}
          aria-label={copy.saved.removeAria}
        >
          ✕
        </button>
      </span>
    </div>
  );
}
