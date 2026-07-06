"use client";

import type { Suggestion } from "../lib/release";
import { copy } from "../lib/strings";
import type { ListType } from "../types/releases";
import { CoverImage } from "./CoverImage";
import { ListBadges } from "./ListBadges";
import { MovieInfoButton } from "./MovieInfoButton";

type Props = {
  item: Suggestion;
  listTypes: ListType[];
  imageSizes: string;
  onSelect: (suggestion: Suggestion) => void;
  onChangeLists?: (suggestion: Suggestion, next: ListType[]) => void;
};

export function PosterCard({
  item,
  listTypes,
  imageSizes,
  onSelect,
  onChangeLists,
}: Props) {
  const saved = listTypes.length > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      className={`poster-card${saved ? " saved" : ""}`}
      onClick={() => onSelect(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(item);
        }
      }}
    >
      <div className="poster-card__media">
        {item.posterUrl ? (
          <CoverImage
            src={item.posterUrl}
            alt={item.title}
            sizes={imageSizes}
          />
        ) : (
          <div className="poster-card-fallback">{item.title.slice(0, 1)}</div>
        )}
      </div>
      <MovieInfoButton
        tmdbId={item.id}
        mediaType={item.mediaType}
        title={item.title}
        onActivate={() => onSelect(item)}
        activeLists={listTypes}
        onChangeLists={
          onChangeLists ? (next) => onChangeLists(item, next) : undefined
        }
      />
      <ListBadges listTypes={listTypes} />
      <div className="poster-card__content">
        <span className="poster-card__title">{item.title}</span>
        <span className="poster-card__meta">
          {item.mediaType === "movie" ? copy.mediaType.movie : copy.mediaType.series}
          {item.year ? ` · ${item.year}` : ""}
        </span>
      </div>
    </div>
  );
}
