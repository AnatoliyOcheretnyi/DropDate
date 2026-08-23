"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Suggestion } from "../../../shared/lib/release";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { Icon } from "../../../shared/ui/Icon";
import { copy } from "../../../shared/lib/strings";
import type { RecommendationItem } from "../hooks/useRecommendations";

type Props = {
  recommendations: RecommendationItem[];
  isLoading: boolean;
  /** Re-rolls the "чому саме це" row without a page reload. */
  onRefresh: () => void;
  isRefreshing: boolean;
  /** Shown instead of personal picks when there is no taste history yet. */
  fallbackItems: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
};

// The six moods the picker opens with, shown here as a preview of that first
// question. They all open /mood: the flow has no query-param entry point, so a
// chip that claimed to preselect a mood would silently not.
const MOODS = [
  { id: "cozy", label: "Спокійно", emoji: "🛋️" },
  { id: "lift", label: "Посміятись", emoji: "😄" },
  { id: "scary", label: "Лоскотати нерви", emoji: "👻" },
  { id: "adrenaline", label: "Адреналін", emoji: "🔥" },
  { id: "cry", label: "Розчулитись", emoji: "😢" },
  { id: "think", label: "Подумати", emoji: "🧠" },
];

const REASON_FALLBACK = "Популярне цього тижня";

function ReasonCard({
  item,
  reason,
  onSelect,
}: {
  item: Suggestion;
  reason: string;
  onSelect: (suggestion: Suggestion) => void;
}) {
  return (
    <button type="button" className="discovery-reason" onClick={() => onSelect(item)}>
      <span className="discovery-reason__thumb" aria-hidden="true">
        {item.posterUrl ? (
          <CoverImage src={item.posterUrl} alt="" sizes="68px" ariaHidden />
        ) : null}
      </span>
      <span className="discovery-reason__body">
        <span className="discovery-reason__chip">{reason}</span>
        <strong className="discovery-reason__title">{item.title}</strong>
        <span className="discovery-reason__meta">
          {item.mediaType === "movie" ? copy.mediaType.movie : copy.mediaType.series}
          {item.year ? ` · ${item.year}` : ""}
        </span>
      </span>
    </button>
  );
}

export function DiscoverySection({
  recommendations,
  isLoading,
  onRefresh,
  isRefreshing,
  fallbackItems,
  onSelect,
}: Props) {
  const router = useRouter();

  // Personal picks come with their own explanation. Without a signed-in taste
  // profile there is nothing to explain, so the row degrades to popular titles
  // under an honest label rather than inventing a reason.
  const hasPersonal = recommendations.length > 0;
  const cards = hasPersonal
    ? recommendations.slice(0, 4).map((item) => ({
        item: {
          id: item.tmdbId,
          title: item.title,
          mediaType: item.mediaType,
          year: item.year,
          posterUrl: item.posterUrl,
        } satisfies Suggestion,
        reason: item.reason?.text?.trim() || REASON_FALLBACK,
      }))
    : fallbackItems.slice(0, 4).map((item) => ({ item, reason: REASON_FALLBACK }));

  return (
    <section className="discovery trend-bleed" aria-labelledby="discovery-title">
      <div className="trend-inner">
        <header className="discovery__head">
          <div>
            <p className="discovery__kicker">НЕ ТІЛЬКИ ТЕ, ЩО ТИ ВЖЕ ЗНАЄШ</p>
            <h2 id="discovery-title" className="discovery__title">
              Відкрий щось нове
            </h2>
          </div>
          <button
            type="button"
            className="discovery__refresh"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <Icon name="refresh-cw" size={16} />
            <span>{isRefreshing ? "Оновлюємо…" : "Інша добірка"}</span>
          </button>
        </header>

        <div className="discovery__row">
          <div className="discovery-mood">
            <p className="discovery-mood__kicker">ПІДБІР ЗА НАСТРОЄМ</p>
            <h3 className="discovery-mood__title">Обери настрій — отримай 5 варіантів</h3>
            <p className="discovery-mood__hint">
              Кілька питань замість години гортання каталогу.
            </p>

            <div className="discovery-mood__chips">
              {MOODS.map((mood) => (
                <button
                  key={mood.id}
                  type="button"
                  className="discovery-mood__chip"
                  onClick={() => router.push("/mood")}
                >
                  <span aria-hidden="true">{mood.emoji}</span>
                  <span>{mood.label}</span>
                </button>
              ))}
            </div>

            <Link href="/mood" className="discovery-mood__cta">
              <span>Підібрати</span>
              <Icon name="arrow-right" size={17} />
            </Link>
          </div>

          {/* Four shortcuts, two by two. "Культурний міст" and "Мій список"
              live here rather than in a separate strip: they are the same kind
              of thing as the other two -- one tap into a way of choosing. */}
          <div className="discovery__tiles">
            <Link href="/games/battle" className="discovery-tile">
              <span className="discovery-tile__icon" aria-hidden="true">
                <Icon name="swords" size={17} />
              </span>
              <Icon name="arrow-up-right" size={15} className="discovery-tile__arrow" />
              <span className="discovery-tile__kicker">ГРА</span>
              <strong className="discovery-tile__title">Кіно-баттл</strong>
              <span className="discovery-tile__hint">
                Два постери — один вибір.
              </span>
            </Link>

            <Link href="/games/wheel" className="discovery-tile discovery-tile--accent">
              <span className="discovery-tile__icon" aria-hidden="true">
                <Icon name="dices" size={17} />
              </span>
              <Icon name="arrow-up-right" size={15} className="discovery-tile__arrow" />
              <span className="discovery-tile__kicker">ОДИН КЛІК</span>
              <strong className="discovery-tile__title">Здивуй мене</strong>
              <span className="discovery-tile__hint">
                Випадковий тайтл під твої фільтри.
              </span>
            </Link>

            <Link href="/bridge" className="discovery-tile">
              <span className="discovery-tile__icon" aria-hidden="true">
                <Icon name="wand-sparkles" size={17} />
              </span>
              <Icon name="arrow-up-right" size={15} className="discovery-tile__arrow" />
              <span className="discovery-tile__kicker">ВІДКРИТТЯ</span>
              <strong className="discovery-tile__title">Культурний міст</strong>
              <span className="discovery-tile__hint">
                Від твого смаку — до іншої кінотрадиції.
              </span>
            </Link>

            <Link href="/saved" className="discovery-tile">
              <span className="discovery-tile__icon" aria-hidden="true">
                <Icon name="bookmark-check" size={17} />
              </span>
              <Icon name="arrow-up-right" size={15} className="discovery-tile__arrow" />
              <span className="discovery-tile__kicker">ТВОЯ КОЛЕКЦІЯ</span>
              <strong className="discovery-tile__title">Мій список</strong>
              <span className="discovery-tile__hint">
                Збережене й те, за чим стежиш.
              </span>
            </Link>
          </div>
        </div>

        <p className="discovery__reasons-kicker">
          <Icon name="wand-sparkles" size={15} />
          <span>
            {hasPersonal
              ? "ПІДІБРАНО ДЛЯ ТЕБЕ — І МИ ПОЯСНЮЄМО ЧОМУ"
              : "ПОПУЛЯРНЕ ЗАРАЗ — УВІЙДИ, ЩОБ ОТРИМУВАТИ ОСОБИСТІ ПІДБІРКИ"}
          </span>
        </p>

        <div className="discovery__reasons">
          {isLoading && cards.length === 0
            ? Array.from({ length: 4 }).map((_, index) => (
                <span key={index} className="discovery-reason discovery-reason--skeleton" />
              ))
            : cards.map(({ item, reason }) => (
                <ReasonCard
                  key={`${item.mediaType}-${item.id}`}
                  item={item}
                  reason={reason}
                  onSelect={onSelect}
                />
              ))}
        </div>
      </div>
    </section>
  );
}
