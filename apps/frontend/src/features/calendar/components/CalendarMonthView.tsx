"use client";

import type { CalendarDay } from "../hooks/useCalendarReleases";
import { CalendarEventCard } from "./CalendarEventCard";

type Props = {
  weeks: CalendarDay[][];
  weekdayLabels: string[];
  onSelectDay: (date: Date) => void;
};

const MAX_VISIBLE = 3;

export function CalendarMonthView({ weeks, weekdayLabels, onSelectDay }: Props) {
  return (
    <div className="calendar-month">
      <div className="calendar-weekday-row" aria-hidden="true">
        {weekdayLabels.map((label) => (
          <span key={label} className="calendar-weekday">
            {label}
          </span>
        ))}
      </div>
      <div className="calendar-month-grid">
        {weeks.map((week, weekIndex) =>
          week.map((day) => {
            const visible = day.events.slice(0, MAX_VISIBLE);
            const overflow = day.events.length - visible.length;
            const cellClass = [
              "calendar-cell",
              day.isCurrentMonth ? "" : "is-outside",
              day.isToday ? "is-today" : "",
              day.isPast ? "is-past" : "",
              day.events.length > 0 ? "has-events" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div
                key={`${weekIndex}-${day.dateKey}`}
                className={cellClass}
                role="button"
                tabIndex={0}
                onClick={() => onSelectDay(day.date)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectDay(day.date);
                  }
                }}
              >
                <div className="calendar-cell-head">
                  <span className="calendar-cell-day">{day.dayNumber}</span>
                  {day.events.length > 0 ? (
                    <span className="calendar-cell-count">
                      {day.events.length}
                    </span>
                  ) : null}
                </div>
                <div className="calendar-cell-events">
                  {visible.map((event) => (
                    <CalendarEventCard
                      key={event.id}
                      event={event}
                      variant="pill"
                    />
                  ))}
                  {overflow > 0 ? (
                    <span className="calendar-cell-more">+{overflow}</span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
