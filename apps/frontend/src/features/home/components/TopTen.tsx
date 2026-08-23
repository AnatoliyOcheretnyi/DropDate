"use client";

import Link from "next/link";
import type { Suggestion } from "../../../shared/lib/release";
import { copy } from "../../../shared/lib/strings";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { Icon } from "../../../shared/ui/Icon";

type Props = {
  items: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
};

const SIZE = 10;

/**
 * The weekly top ten: a ranked, horizontally scrolling row.
 *
 * The rank is the point of the section, so it is drawn as an oversized outlined
 * numeral beside the poster rather than a small badge on it -- the row should be
 * readable as a chart at a glance.
 */
export function TopTen({ items, onSelect }: Props) {
  const ranked = items.slice(0, SIZE);

  return (
    <section className="top-ten trend-bleed" aria-labelledby="top-ten-title">
      <div className="trend-inner">
        <header className="top-ten__head">
          <p className="new-releases__kicker">ЩО ДИВЛЯТЬСЯ ЗАРАЗ</p>
          <h2 id="top-ten-title" className="new-releases__title">
            Топ-10 цього тижня
          </h2>
        </header>

        {ranked.length === 0 ? (
          <div className="section-empty">
            <span className="section-empty__badge" aria-hidden="true">
              <Icon name="chart-no-axes-column" size={20} />
            </span>
            <div className="section-empty__text">
              <strong>Чарт ще формується</strong>
              <p>
                Тиждень щойно почався. Рейтинг оновиться, щойно набереться
                достатньо переглядів.
              </p>
            </div>
            <Link href="/catalog" className="section-empty__action">
              <Icon name="history" size={16} />
              <span>Топ минулого тижня</span>
            </Link>
          </div>
        ) : (
        <ol className="top-ten__row">
          {ranked.map((item, index) => (
            <li key={`${item.mediaType}-${item.id}`} className="top-ten__item">
              <button
                type="button"
                className="top-ten__card"
                onClick={() => onSelect(item)}
              >
                <span className="top-ten__figure">
                  <span className="top-ten__rank" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="top-ten__poster">
                    {item.posterUrl ? (
                      <CoverImage
                        src={item.posterUrl}
                        alt=""
                        sizes="(max-width: 900px) 34vw, 150px"
                        ariaHidden
                      />
                    ) : (
                      <span className="top-ten__fallback" aria-hidden="true">
                        {item.title.slice(0, 1)}
                      </span>
                    )}
                  </span>
                </span>
                <span className="top-ten__body">
                  <strong className="top-ten__title">{item.title}</strong>
                  <span className="top-ten__meta">
                    {item.mediaType === "movie"
                      ? copy.mediaType.movie
                      : copy.mediaType.series}
                    {item.year ? ` · ${item.year}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        )}
      </div>
    </section>
  );
}
