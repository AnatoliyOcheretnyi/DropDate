"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { Icon } from "../../../shared/ui/Icon";
import type { Suggestion } from "../../../shared/lib/release";
import type { DailyPick } from "../hooks/useDailyPick";
import { useCountdown } from "../hooks/useCountdown";

/** The pick rolls over at 09:00 local time. */
const REFRESH_HOUR = 9;

const nextRefresh = () => {
  const now = new Date();
  const target = new Date(now);
  target.setHours(REFRESH_HOUR, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
};

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Shown to a signed-in user the recommender does not know well enough yet.
 * The pick needs a taste signal to be worth anything, so the empty state asks
 * for exactly that rather than showing a weaker recommendation.
 */
export function DailyPickEmpty() {
  return (
    <section className="section-empty" aria-labelledby="pick-day-empty-title">
      <span className="section-empty__badge" aria-hidden="true">
        <Icon name="sparkles" size={20} />
      </span>
      <div className="section-empty__text">
        <strong id="pick-day-empty-title">
          Ще трохи — і буде твій перший пік
        </strong>
        <p>
          Оціни 5 тайтлів, щоб ми зрозуміли смак. Тоді щоранку даватимемо одну
          точну рекомендацію.
        </p>
      </div>
      <Link href="/search" className="section-empty__action">
        <Icon name="star" size={16} />
        <span>Оцінити тайтли</span>
      </Link>
    </section>
  );
}

type Props = {
  pick: DailyPick;
  saved: boolean;
  action: "none" | "saved" | "disliked";
  revealed: boolean;
  busy?: boolean;
  onReveal: () => void;
  onSelect: (suggestion: Suggestion) => void;
  onToggleSave: (suggestion: Suggestion) => void;
  onDislike: () => void;
};

/**
 * One recommendation a day, and the reason it was chosen.
 *
 * Until it is opened the card stays under a spoiler: the poster is blurred and
 * the title withheld, so the reveal is the interaction rather than a decoration
 * on top of content the user has already read.
 */
export function DailyPickCard({
  pick,
  saved,
  action,
  revealed,
  busy,
  onReveal,
  onSelect,
  onToggleSave,
  onDislike,
}: Props) {
  const suggestion: Suggestion = {
    id: pick.tmdbId,
    mediaType: pick.mediaType,
    title: pick.title,
    year: pick.year,
    posterUrl: pick.posterUrl,
  };

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long" })
        .format(new Date(`${pick.date}T00:00:00Z`))
        .toUpperCase(),
    [pick.date]
  );

  const target = useMemo(nextRefresh, []);
  const { remaining } = useCountdown(target);

  const isSaved = action === "saved" || saved;

  const nextPick = (
    <div className="pick-day__next">
      <p className="pick-day__next-kicker">НАСТУПНИЙ ПІК ЧЕРЕЗ</p>
      {/* Rendered only after mount: the server has a different "now". */}
      <p className="pick-day__countdown">
        {remaining
          ? `${pad(remaining.hours)}:${pad(remaining.minutes)}:${pad(remaining.seconds)}`
          : "--:--:--"}
      </p>
      <p className="pick-day__next-note">
        Один тайтл на день. Оновлюється о 09:00.
      </p>
    </div>
  );

  if (!revealed) {
    return (
      <section
        className="pick-day pick-day--closed"
        aria-labelledby="pick-day-title"
      >
        <div className="pick-day__poster pick-day__poster--hidden">
          {pick.posterUrl ? (
            <CoverImage
              src={pick.posterUrl}
              alt=""
              sizes="132px"
              ariaHidden
            />
          ) : null}
          <span className="pick-day__lock" aria-hidden="true">
            <Icon name="eye-off" size={20} />
          </span>
        </div>

        <div className="pick-day__main">
          <p className="pick-day__kicker">
            <span>ПІК ДНЯ</span>
            <span className="pick-day__date">· {dateLabel}</span>
          </p>
          <h2 id="pick-day-title" className="pick-day__title pick-day__title--closed">
            Сьогоднішня рекомендація — під спойлером
          </h2>
          <p className="pick-day__desc">
            Один тайтл на день, підібраний під твій смак. Відкриєш — побачиш
            постер, назву й причину вибору.
          </p>
          <div className="pick-day__actions">
            <button
              type="button"
              className="pick-day__btn pick-day__btn--primary"
              onClick={onReveal}
              disabled={busy}
            >
              <Icon name="sparkles" size={16} />
              <span>{busy ? "Відкриваємо…" : "Відкрити пік дня"}</span>
            </button>
            <button
              type="button"
              className="pick-day__btn pick-day__btn--ghost"
              onClick={onDislike}
              disabled={busy}
            >
              <Icon name="x" size={16} />
              <span>Пропустити сьогодні</span>
            </button>
          </div>
        </div>

        {nextPick}
      </section>
    );
  }

  return (
    <section className="pick-day" aria-labelledby="pick-day-title">
      <button
        type="button"
        className="pick-day__poster"
        onClick={() => onSelect(suggestion)}
        aria-label={pick.title}
      >
        {pick.posterUrl ? (
          <CoverImage src={pick.posterUrl} alt="" sizes="132px" ariaHidden />
        ) : (
          <span className="pick-day__fallback" aria-hidden="true">
            {pick.title.slice(0, 1)}
          </span>
        )}
      </button>

      <div className="pick-day__main">
        <p className="pick-day__kicker">
          <span>ПІК ДНЯ</span>
          <span className="pick-day__date">· {dateLabel}</span>
        </p>
        <h2 id="pick-day-title" className="pick-day__title">
          {pick.title}
        </h2>
        <p className="pick-day__meta">
          {pick.mediaType === "movie" ? "Фільм" : "Серіал"}
          {pick.year ? ` · ${pick.year}` : ""}
        </p>

        {/* The reason is what separates a pick from an ad, so it always shows —
            falling back to a generic line rather than disappearing. */}
        <p className="pick-day__why">
          <Icon name="wand-sparkles" size={14} />
          <span>
            {pick.reason.text || "Один персональний вибір на сьогодні."}
          </span>
        </p>

        <div className="pick-day__actions">
          <button
            type="button"
            className="pick-day__btn pick-day__btn--primary"
            onClick={() => onSelect(suggestion)}
          >
            <Icon name="arrow-right" size={16} />
            <span>Детальніше</span>
          </button>
          <button
            type="button"
            className={`pick-day__btn pick-day__btn--save${isSaved ? " is-active" : ""}`}
            onClick={() => onToggleSave(suggestion)}
            disabled={busy || action === "disliked"}
          >
            <Icon name={isSaved ? "bookmark-check" : "bookmark-plus"} size={16} />
            <span>{isSaved ? "Збережено" : "Зберегти"}</span>
          </button>
          <button
            type="button"
            className={`pick-day__btn pick-day__btn--ghost${action === "disliked" ? " is-active" : ""}`}
            onClick={onDislike}
            disabled={busy || action === "saved"}
          >
            <Icon name="thumbs-down" size={16} />
            <span>Не цікавить</span>
          </button>
        </div>
      </div>

      {nextPick}
    </section>
  );
}
