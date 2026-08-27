"use client";

import { useRouter } from "next/navigation";
import type { ListType, SavedRelease } from "../../../shared/types/releases";
import type { Suggestion } from "../../../shared/lib/release";
import { copy } from "../../../shared/lib/strings";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { ListBadges } from "../../../shared/ui/ListBadges";
import { MovieInfoButton } from "../../../shared/ui/MovieInfoButton";
import { StarRating } from "../../../shared/ui/StarRating";
import { formatSavedDate, savedMediaType, savedMetaLine } from "../utils/savedPresentation";

type Props = {
  item: SavedRelease;
  onRemove: (item: SavedRelease) => void;
  onChangeLists?: (item: SavedRelease, next: ListType[]) => void;
  onRate?: (item: SavedRelease, rating: number) => void;
  /** List badges only make sense on the union tab, where the list is not obvious. */
  showBadges?: boolean;
  actionsDisabled?: boolean;
};

/**
 * Poster card, same geometry as the "Нові релізи" cards on the home page: six
 * per row instead of three, so a 128-title library scans four times faster than
 * with the old 16:10 banners.
 */
export function SavedPosterCard({
  item,
  onRemove,
  onChangeLists,
  onRate,
  showBadges = false,
  actionsDisabled,
}: Props) {
  const router = useRouter();
  const mediaType: Suggestion["mediaType"] = savedMediaType(item);
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
    <article className="saved-card">
      <div className="saved-card-poster">
        {posterUrl ? (
          <CoverImage
            src={posterUrl}
            alt={item.title}
            sizes="(max-width: 600px) 45vw, (max-width: 1100px) 25vw, 210px"
          />
        ) : (
          <div className="saved-card-fallback" aria-hidden="true">
            {item.title.slice(0, 1)}
          </div>
        )}

        <button
          type="button"
          className="saved-card-link"
          onClick={open}
          aria-label={item.title}
        />

        <div className="saved-card-top">
          {rating ? (
            <span
              className={`saved-card-rating${hasOwnRating ? " is-mine" : ""}`}
              title={hasOwnRating ? "Моя оцінка" : "Оцінка TMDB"}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.9l-5.8 3.05 1.1-6.47-4.7-4.58 6.5-.95L12 2.5Z" />
              </svg>
              {rating}
            </span>
          ) : (
            <span />
          )}

          <div className="saved-card-actions">
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
          </div>
        </div>

        <div className="saved-card-bottom">
          {showBadges ? <ListBadges listTypes={item.listTypes ?? []} /> : <span />}
          {date ? <span className="saved-card-date">{date}</span> : null}
        </div>

        {/* Stars are a prompt to rate, so they only show on titles that have no
            rating yet; a rated title already shows its score in the chip. */}
        {item.tmdbId && onRate && !hasOwnRating ? (
          <div
            className="saved-card-stars"
            onClick={(event) => event.stopPropagation()}
          >
            <StarRating onChange={(next) => onRate(item, next)} />
          </div>
        ) : null}
      </div>

      <div className="saved-card-caption">
        <h4>{item.title}</h4>
        <span>{savedMetaLine(item)}</span>
      </div>
    </article>
  );
}
