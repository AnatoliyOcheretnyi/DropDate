"use client";

import { memo } from "react";
import type { Suggestion } from "../../../shared/lib/release";
import type { ListType } from "../../../shared/types/releases";
import { copy } from "../../../shared/lib/strings";
import { ListBadges } from "../../../shared/ui/ListBadges";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { MovieInfoButton } from "../../../shared/ui/MovieInfoButton";

type Props = {
  title: string;
  kicker?: string;
  items: Suggestion[];
  isLoading: boolean;
  onSelect: (suggestion: Suggestion) => void;
  getListTypes: (suggestion: Suggestion) => ListType[];
};

function TrendingCarouselComponent({
  title,
  kicker,
  items,
  isLoading,
  onSelect,
  getListTypes,
}: Props) {
  if (!isLoading && items.length === 0) {
    return null;
  }

  return (
    <section className="trend-section trend-bleed">
      <div className="trend-inner">
        <div className="trend-shell">
          <div className="trend-head">
            <div className="trend-copy">
              {kicker ? <p className="trend-kicker">{kicker}</p> : null}
              <div className="grid-head">
                <h3>{title}</h3>
                {isLoading && <p className="hint">{copy.hints.loadingCollection}</p>}
              </div>
            </div>
          </div>
          <div className="trend-carousel" aria-label={title}>
            <div className="trend-track">
              {items.map((item) => {
                const listTypes = getListTypes(item);
                const saved = listTypes.length > 0;

                return (
                  <div
                    key={`${item.mediaType}-${item.id}`}
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
                          sizes="(max-width: 900px) 40vw, 176px"
                        />
                      ) : (
                        <div className="poster-card-fallback">
                          {item.title.slice(0, 1)}
                        </div>
                      )}
                    </div>
                    <MovieInfoButton
                      tmdbId={item.id}
                      mediaType={item.mediaType}
                      title={item.title}
                      onActivate={() => onSelect(item)}
                    />
                    <ListBadges listTypes={listTypes} />
                    <div className="poster-card__content">
                      <span className="poster-card__title">{item.title}</span>
                      <span className="poster-card__meta">
                        {item.mediaType === "movie"
                          ? copy.mediaType.movie
                          : copy.mediaType.series}
                        {item.year ? ` · ${item.year}` : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const TrendingCarousel = memo(TrendingCarouselComponent);
