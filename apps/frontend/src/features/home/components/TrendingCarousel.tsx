"use client";

import { memo } from "react";
import type { Suggestion } from "../../../shared/lib/release";
import type { ListType } from "../../../shared/types/releases";
import { copy } from "../../../shared/lib/strings";
import { PosterCard } from "../../../shared/ui/PosterCard";
import type {
  RecommendationFeedback,
  RecommendationFeedbackAction,
} from "../hooks/useRecommendations";

type Props = {
  title: string;
  kicker?: string;
  items: Suggestion[];
  isLoading: boolean;
  onSelect: (suggestion: Suggestion) => void;
  getListTypes: (suggestion: Suggestion) => ListType[];
  onChangeLists?: (suggestion: Suggestion, next: ListType[]) => void;
  feedback?: Record<string, RecommendationFeedback>;
  onFeedback?: (suggestion: Suggestion, action: RecommendationFeedbackAction) => void;
};

function TrendingCarouselComponent({
  title,
  kicker,
  items,
  isLoading,
  onSelect,
  getListTypes,
  onChangeLists,
  feedback,
  onFeedback,
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

                const feedbackKey = `${item.mediaType}:${item.id}`;
                const savedFeedback = feedback?.[feedbackKey];
                return (
                  <div
                    className={`recommendation-card${savedFeedback ? ` has-feedback feedback-${savedFeedback}` : ""}`}
                    key={feedbackKey}
                  >
                    <PosterCard
                    key={`${item.mediaType}-${item.id}`}
                    item={item}
                    listTypes={listTypes}
                    imageSizes="(max-width: 900px) 40vw, 176px"
                    onSelect={onSelect}
                    onChangeLists={onChangeLists}
                    />
                    {onFeedback ? (
                      <div className="recommendation-feedback" aria-label={`Оцінити рекомендацію «${item.title}»`}>
                        {savedFeedback ? (
                          <button
                            type="button"
                            className="cancel-feedback"
                            aria-label="Скасувати оцінку"
                            title="Скасувати й обрати ще раз"
                            onClick={(event) => {
                              event.stopPropagation();
                              onFeedback(item, "none");
                            }}
                          ><span aria-hidden="true">×</span></button>
                        ) : (
                          <>
                            <button
                              type="button"
                              aria-pressed="false"
                              aria-label="Цікаво"
                              title="Цікаво"
                              onClick={(event) => { event.stopPropagation(); onFeedback(item, "liked"); }}
                            >👍</button>
                            <button
                              type="button"
                              aria-pressed="false"
                              aria-label="Не моє"
                              title="Не моє"
                              onClick={(event) => { event.stopPropagation(); onFeedback(item, "disliked"); }}
                            >👎</button>
                          </>
                        )}
                      </div>
                    ) : null}
                    {savedFeedback ? (
                      <div
                        className={`recommendation-feedback-saved ${savedFeedback}`}
                        role="status"
                      >
                        <span aria-hidden="true">✓</span>
                        Збережено: {savedFeedback === "liked" ? "цікаво" : "не моє"}
                      </div>
                    ) : null}
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
