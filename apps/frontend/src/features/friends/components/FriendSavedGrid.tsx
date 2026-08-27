"use client";

import { useRouter } from "next/navigation";
import type { Suggestion } from "../../../shared/lib/release";
import type { SavedRelease } from "../../../shared/types/releases";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { MovieInfoButton } from "../../../shared/ui/MovieInfoButton";
import { StarRating } from "../../../shared/ui/StarRating";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";

type Props = {
  items: SavedRelease[];
};

export function FriendSavedGrid({ items }: Props) {
  const router = useRouter();
  const { getListTypes, setSuggestionLists } = useSavedReleases();

  if (items.length === 0) {
    return <div className="friends-empty">Тут поки порожньо.</div>;
  }

  const gridClass = `friend-saved-grid${
    items.length === 1
      ? " friend-saved-grid--single"
      : items.length === 2
        ? " friend-saved-grid--double"
        : ""
  }`;

  return (
    <div className={gridClass}>
      {items.map((item) => {
        const mediaType: Suggestion["mediaType"] =
          item.mediaType || (item.type === "movie" ? "movie" : "tv");
        const imageUrl = item.backdropUrl || item.posterUrl;
        const usesPoster = !item.backdropUrl && Boolean(item.posterUrl);
        const suggestion: Suggestion | null = item.tmdbId
          ? {
              id: item.tmdbId,
              title: item.title,
              mediaType,
              posterUrl: item.posterUrl,
            }
          : null;

        return (
          <div key={item.id} className="saved-banner-card">
            {item.userRating ? (
              <div className="saved-banner-rating saved-banner-rating--readonly">
                <StarRating value={item.userRating} readOnly />
              </div>
            ) : null}
            {suggestion ? (
              <MovieInfoButton
                tmdbId={suggestion.id}
                mediaType={mediaType}
                title={item.title}
                className="saved-info-btn friend-saved-info-btn"
                onActivate={() => router.push(`/title/${mediaType}/${suggestion.id}`)}
                activeLists={getListTypes(suggestion)}
                onChangeLists={(next) => setSuggestionLists(suggestion, next, item)}
              />
            ) : null}
            <button
              type="button"
              className="saved-banner-link"
              onClick={() => {
                if (item.tmdbId) {
                  router.push(`/title/${mediaType}/${item.tmdbId}`);
                } else {
                  router.push(`/search?query=${encodeURIComponent(item.title)}`);
                }
              }}
            >
              <div className={`saved-banner-media${usesPoster ? " is-poster" : ""}`}>
                {imageUrl ? (
                  <CoverImage
                    src={imageUrl}
                    alt={item.title}
                    sizes="(max-width: 900px) 100vw, 33vw"
                  />
                ) : (
                  <div className="saved-banner-fallback">{item.title.slice(0, 1)}</div>
                )}
              </div>
              <div className="saved-banner-overlay" aria-hidden="true" />
              <div className="saved-banner-content">
                <h4>{item.title}</h4>
                <span className="saved-banner-type">
                  {mediaType === "movie" ? "Фільм" : "Серіал"}
                </span>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
