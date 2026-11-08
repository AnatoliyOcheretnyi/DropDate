"use client";
import { MovieInfoButton } from "../../../shared/ui/MovieInfoButton";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../../shared/state/auth";
import { AuthModal } from "../../../widgets/AuthModal";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { track } from "../../../shared/lib/analytics";
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
  novelty: number;
  onNovelty: (value: number) => void;
  onFeedback: (
    item: Suggestion,
    action: "liked" | "disliked",
  ) => Promise<boolean | undefined>;
  onExclude: (item: Suggestion) => void;
  exhausted: boolean;
  onRestart: () => void;
  error: Error | null;
};

// Shortcuts retain the chosen mood throughout the adaptive flow.
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
    <button
      type="button"
      className="discovery-reason"
      onClick={() => onSelect(item)}
    >
      <span className="discovery-reason__thumb" aria-hidden="true">
        {item.posterUrl ? (
          <CoverImage src={item.posterUrl} alt="" sizes="68px" ariaHidden />
        ) : null}
      </span>
      <span className="discovery-reason__body">
        <span className="discovery-reason__chip">{reason}</span>
        <strong className="discovery-reason__title">{item.title}</strong>
        <span className="discovery-reason__meta">
          {item.mediaType === "movie"
            ? copy.mediaType.movie
            : copy.mediaType.series}
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
  novelty,
  onNovelty,
  onFeedback,
  onExclude,
  exhausted,
  onRestart,
  error,
}: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { getListTypes, toggleListType } = useSavedReleases();
  const [authOpen, setAuthOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const react = async (item: Suggestion, action: "liked" | "disliked") => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setBusy(`${item.mediaType}:${item.id}`);
    try {
      const ok = await onFeedback(item, action);
      setNotice(ok ? "Врахували твій відгук" : "Не вдалося зберегти відгук");
      if (ok && action === "disliked") onExclude(item);
      track("recommendation_feedback", {
        surface: "home",
        action,
        tmdbId: item.id,
      });
    } finally {
      setBusy(null);
    }
  };
  const save = async (item: Suggestion, kind: "watchlist" | "watched") => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (kind !== "watched" || !getListTypes(item).includes("watched"))
      toggleListType(item, kind, {
        title: item.title,
        type: item.mediaType === "movie" ? "movie" : "series",
        nextRelease: "",
        source: "tmdb",
        posterUrl: item.posterUrl,
        status: "released",
      });
    if (kind === "watched") onExclude(item);
    track(kind === "watched" ? "title_watched" : "title_saved", {
      surface: "home",
      tmdbId: item.id,
    });
  };

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
        reason: item.reason?.text?.trim() || "За твоїми вподобаннями",
      }))
    : (exhausted ? [] : fallbackItems)
        .slice(0, 4)
        .map((item) => ({ item, reason: REASON_FALLBACK }));

  const shownIDs = cards
    .map((c) => `${c.item.mediaType}:${c.item.id}`)
    .join(",");
  useEffect(() => {
    if (shownIDs && !isLoading)
      track("recommendations_shown", {
        surface: "home",
        items: shownIDs,
        personal: hasPersonal,
      });
  }, [shownIDs, isLoading, hasPersonal]);
  return (
    <section
      className="discovery trend-bleed"
      aria-labelledby="discovery-title"
    >
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
            disabled={isRefreshing || !hasPersonal}
          >
            <Icon name="refresh-cw" size={16} />
            <span>{isRefreshing ? "Оновлюємо…" : "Інша добірка"}</span>
          </button>
        </header>

        <div className="discovery__row">
          <div className="discovery-mood">
            <p className="discovery-mood__kicker">ПІДБІР ЗА НАСТРОЄМ</p>
            <h3 className="discovery-mood__title">
              Обери настрій — знайди своє кіно
            </h3>
            <p className="discovery-mood__hint">
              Кілька питань замість години гортання каталогу.
            </p>

            <div className="discovery-mood__chips">
              {MOODS.map((mood) => (
                <button
                  key={mood.id}
                  type="button"
                  className="discovery-mood__chip"
                  onClick={() => router.push(`/mood?mood=${mood.id}`)}
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
            <Link href="/world" className="discovery-tile">
              <span className="discovery-tile__icon" aria-hidden="true">
                <span aria-hidden="true">◎</span>
              </span>
              <Icon
                name="arrow-up-right"
                size={15}
                className="discovery-tile__arrow"
              />
              <span className="discovery-tile__kicker">КІНОПОДОРОЖ</span>
              <strong className="discovery-tile__title">Світ кіно</strong>
              <span className="discovery-tile__hint">
                Обертай глобус. Відкривай країни.
              </span>
            </Link>

            <Link
              href="/games/wheel"
              className="discovery-tile discovery-tile--accent"
            >
              <span className="discovery-tile__icon" aria-hidden="true">
                <Icon name="dices" size={17} />
              </span>
              <Icon
                name="arrow-up-right"
                size={15}
                className="discovery-tile__arrow"
              />
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
              <Icon
                name="arrow-up-right"
                size={15}
                className="discovery-tile__arrow"
              />
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
              <Icon
                name="arrow-up-right"
                size={15}
                className="discovery-tile__arrow"
              />
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
              : user
                ? isLoading
                  ? "ПІДБИРАЄМО ДЛЯ ТЕБЕ…"
                  : "ПОПУЛЯРНЕ ЗАРАЗ"
                : "ПОПУЛЯРНЕ ЗАРАЗ — УВІЙДИ, ЩОБ ОТРИМУВАТИ ОСОБИСТІ ПІДБІРКИ"}
          </span>
        </p>

        {user && (
          <div className="discovery-controls">
            <label>
              Ближче до мого смаку{" "}
              <input
                aria-label="Рівень новизни рекомендацій"
                type="range"
                min="0"
                max="100"
                step="20"
                value={novelty}
                onChange={(e) => onNovelty(Number(e.target.value))}
              />{" "}
              Здивуй мене
            </label>
          </div>
        )}
        {notice && <p role="status">{notice}</p>}
        {error && (
          <p role="alert">
            {error.message}{" "}
            <button
              className="discovery__refresh"
              onClick={onRestart}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Оновлюємо…" : "Повторити"}
            </button>
          </p>
        )}
        {exhausted && (
          <p role="status">
            Ти переглянув усю добірку.{" "}
            <button onClick={onRestart}>Повернутися до початку</button>
          </p>
        )}
        <div className="discovery__reasons">
          {isLoading && cards.length === 0
            ? Array.from({ length: 4 }).map((_, index) => (
                <span
                  key={index}
                  className="discovery-reason discovery-reason--skeleton"
                />
              ))
            : cards.map(({ item, reason }) => (
                <article
                  className="discovery-pick"
                  key={`${item.mediaType}-${item.id}`}
                >
                  <MovieInfoButton tmdbId={item.id} mediaType={item.mediaType} title={item.title} activeLists={getListTypes(item)} onActivate={() => onSelect(item)} />
                  <ReasonCard
                    item={item}
                    reason={reason}
                    onSelect={(picked) => {
                      track("recommendation_opened", {
                        surface: "home",
                        tmdbId: picked.id,
                      });
                      onSelect(picked);
                    }}
                  />
                  <div className="discovery-pick__actions">
                    <button onClick={() => void save(item, "watchlist")}>
                      {getListTypes(item).includes("watchlist")
                        ? "Збережено ✓"
                        : "+ Зберегти"}
                    </button>
                    <button onClick={() => void save(item, "watched")}>
                      Вже бачив
                    </button>
                  </div>
                  {hasPersonal && (
                    <div className="discovery-pick__feedback">
                      <button
                        disabled={busy === `${item.mediaType}:${item.id}`}
                        onClick={() => void react(item, "liked")}
                      >
                        Цікаво
                      </button>
                      <button
                        disabled={busy === `${item.mediaType}:${item.id}`}
                        onClick={() => void react(item, "disliked")}
                      >
                        Не моє
                      </button>
                      <button onClick={() => onExclude(item)}>
                        Не сьогодні
                      </button>
                    </div>
                  )}
                </article>
              ))}
        </div>
      </div>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </section>
  );
}
