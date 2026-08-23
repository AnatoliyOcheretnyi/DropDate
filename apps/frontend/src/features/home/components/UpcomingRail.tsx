"use client";

import Link from "next/link";
import type { Suggestion } from "../../../shared/lib/release";
import type { ListType } from "../../../shared/types/releases";
import { copy } from "../../../shared/lib/strings";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { Icon } from "../../../shared/ui/Icon";

type Props = {
  items: Suggestion[];
  isLoading: boolean;
  getListTypes: (suggestion: Suggestion) => ListType[];
  onChangeLists: (suggestion: Suggestion, next: ListType[]) => void;
  onSelect: (suggestion: Suggestion) => void;
};

const VISIBLE = 8;

/**
 * Titles that have not landed yet.
 *
 * Deliberately its own row rather than a tab under "Нові релізи": that section
 * is about what already came out, and folding the opposite meaning into it
 * would make both harder to read. It sits next to the calendar, which is the
 * other half of the same question -- when does it drop.
 */
export function UpcomingRail({
  items,
  isLoading,
  getListTypes,
  onChangeLists,
  onSelect,
}: Props) {
  const visible = items.slice(0, VISIBLE);
  const isEmpty = !isLoading && visible.length === 0;

  return (
    <section className="upcoming-rail trend-bleed" aria-labelledby="upcoming-title">
      <div className="trend-inner">
        <header className="upcoming-rail__head">
          <div>
            <p className="new-releases__kicker">ЩЕ НЕ ВИЙШЛО</p>
            <h2 id="upcoming-title" className="new-releases__title">
              Скоро вийде
            </h2>
          </div>
          <Link href="/calendar" className="calendar-home__all">
            <span>У календар</span>
            <Icon name="calendar-days" size={16} />
          </Link>
        </header>

        {isEmpty ? (
          <div className="section-empty">
            <span className="section-empty__badge" aria-hidden="true">
              <Icon name="calendar-clock" size={20} />
            </span>
            <div className="section-empty__text">
              <strong>Поки що жодного анонсу</strong>
              <p>
                Щойно зʼявляться дати премʼєр — вони будуть тут. Сповіщення
                можна ввімкнути заздалегідь.
              </p>
            </div>
            <Link href="/calendar" className="section-empty__action">
              <Icon name="calendar-days" size={16} />
              <span>У календар</span>
            </Link>
          </div>
        ) : (
        <div className="upcoming-rail__row">
          {isLoading && visible.length === 0
            ? Array.from({ length: VISIBLE }).map((_, index) => (
                <span key={index} className="new-release new-release--skeleton" />
              ))
            : visible.map((item) => {
                const lists = getListTypes(item);
                const isTracked = lists.includes("follow");
                return (
                  <article key={`${item.mediaType}-${item.id}`} className="new-release">
                    <button
                      type="button"
                      className="new-release__poster"
                      onClick={() => onSelect(item)}
                      aria-label={item.title}
                    >
                      {item.posterUrl ? (
                        <CoverImage
                          src={item.posterUrl}
                          alt=""
                          sizes="(max-width: 900px) 45vw, 180px"
                          ariaHidden
                        />
                      ) : (
                        <span className="new-release__fallback" aria-hidden="true">
                          {item.title.slice(0, 1)}
                        </span>
                      )}
                    </button>

                    {/* Upcoming titles get "remind me" rather than "save": the
                        useful action before a release is to follow it. */}
                    <button
                      type="button"
                      className={`new-release__save${isTracked ? " is-saved" : ""}`}
                      onClick={() =>
                        onChangeLists(
                          item,
                          isTracked
                            ? lists.filter((list) => list !== "follow")
                            : [...lists, "follow"]
                        )
                      }
                      aria-label={
                        isTracked
                          ? `${item.title}: стежиш за релізом`
                          : `Нагадати про реліз «${item.title}»`
                      }
                    >
                      <Icon name={isTracked ? "bookmark-check" : "bell"} size={16} />
                    </button>

                    <h3 className="new-release__title">{item.title}</h3>
                    <p className="new-release__meta">
                      {item.mediaType === "movie"
                        ? copy.mediaType.movie
                        : copy.mediaType.series}
                      {item.year ? ` · ${item.year}` : ""}
                    </p>
                  </article>
                );
              })}
        </div>
        )}
      </div>
    </section>
  );
}
