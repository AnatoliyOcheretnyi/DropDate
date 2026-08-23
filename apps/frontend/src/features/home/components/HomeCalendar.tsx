"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { Icon } from "../../../shared/ui/Icon";
import { useWeekAhead, type WeekDay } from "../hooks/useWeekAhead";

type Props = {
  isSignedIn: boolean;
};

const RELATIVE_FMT = new Intl.RelativeTimeFormat("uk-UA", { numeric: "auto" });

const daysBetween = (from: Date, to: Date) =>
  Math.round((to.getTime() - from.getTime()) / 86400000);

/** "вже завтра" / "за 4 дні" — never a bare date, which reads as a deadline. */
const nearestLabel = (nearest: Date | null) => {
  if (!nearest) {
    return null;
  }
  const today = new Date();
  const diff = daysBetween(
    new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    nearest
  );
  if (diff <= 0) {
    return "сьогодні";
  }
  return RELATIVE_FMT.format(diff, "day");
};

function DayColumn({ day, onOpen }: { day: WeekDay; onOpen: (id?: number, media?: string) => void }) {
  return (
    <div className={`calendar-home__day${day.isToday ? " is-today" : ""}`}>
      <div className="calendar-home__day-head">
        <span className="calendar-home__weekday">
          {day.isToday ? "СЬОГОДНІ" : day.weekdayLabel}
        </span>
        <strong className="calendar-home__date">{day.dayLabel}</strong>
      </div>

      <div className="calendar-home__events">
        {day.events.length === 0 ? (
          // The empty day is part of the design, not a gap to hide: a week with
          // nothing coming should look calm rather than broken.
          <div className="calendar-home__empty">
            <Icon name="moon" size={18} />
            <span>Релізів немає</span>
          </div>
        ) : (
          day.events.map((event) => (
            <button
              key={event.id}
              type="button"
              className="calendar-home__event"
              onClick={() => onOpen(event.tmdbId, event.mediaType)}
            >
              <span className="calendar-home__event-media" aria-hidden="true">
                {event.backdropUrl || event.posterUrl ? (
                  <CoverImage
                    src={event.backdropUrl || event.posterUrl || ""}
                    alt=""
                    sizes="200px"
                    ariaHidden
                  />
                ) : null}
              </span>
              <span className="calendar-home__event-title">{event.title}</span>
              <span className="calendar-home__event-meta">
                {event.isSeries ? "СЕРІАЛ" : "ФІЛЬМ"}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function HomeCalendar({ isSignedIn }: Props) {
  const router = useRouter();
  const { days, trackedCount, nearestRelease } = useWeekAhead();

  const nearest = nearestLabel(nearestRelease);

  const handleOpen = (tmdbId?: number, mediaType?: string) => {
    if (!tmdbId || !mediaType) {
      return;
    }
    router.push(`/title/${mediaType}/${tmdbId}`);
  };

  return (
    <section className="calendar-home trend-bleed" aria-labelledby="calendar-home-title">
      <div className="trend-inner">
        <header className="calendar-home__head">
          <div>
            <p className="calendar-strip__kicker">КАЛЕНДАР РЕЛІЗІВ</p>
            <h2 id="calendar-home-title" className="calendar-home__title">
              Що виходить цього тижня
            </h2>
          </div>
          <Link href="/calendar" className="calendar-home__all">
            <span>Весь календар</span>
            <Icon name="calendar-days" size={16} />
          </Link>
        </header>

        <div className="calendar-home__strip">
          <span className="calendar-home__strip-icon" aria-hidden="true">
            <Icon name="bookmark-check" size={17} />
          </span>
          <p>
            {!isSignedIn
              ? "Увійди — і тут зʼявляться релізи тайтлів, за якими ти стежиш"
              : trackedCount === 0
                ? "Ти ще ні за чим не стежиш — додай тайтл, і його реліз зʼявиться тут"
                : `Ти стежиш за ${trackedCount} тайтлами${
                    nearest ? ` — найближчий реліз ${nearest}` : ""
                  }`}
          </p>
          <Link href={isSignedIn ? "/saved" : "/calendar"} className="calendar-home__strip-link">
            <span>{isSignedIn ? "Мій список" : "Календар"}</span>
            <Icon name="arrow-right" size={15} />
          </Link>
        </div>

        <div className="calendar-home__week">
          {days.map((day) => (
            <DayColumn key={day.dateKey} day={day} onOpen={handleOpen} />
          ))}
        </div>
      </div>
    </section>
  );
}
