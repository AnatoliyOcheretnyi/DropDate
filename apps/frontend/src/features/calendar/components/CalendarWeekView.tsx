"use client";

import type { CalendarDay } from "../hooks/useCalendarReleases";
import { CalendarEventCard } from "./CalendarEventCard";

type Props = {
  days: CalendarDay[];
};

export function CalendarWeekView({ days }: Props) {
  return (
    <div className="calendar-week">
      {days.map((day) => {
        const columnClass = [
          "calendar-week-column",
          day.isToday ? "is-today" : "",
          day.isPast ? "is-past" : "",
          day.events.length > 0 ? "has-events" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <div key={day.dateKey} className={columnClass}>
            <div className="calendar-week-head">
              <span className="calendar-week-weekday">{day.weekdayLabel}</span>
              <span className="calendar-week-day">{day.dayNumber}</span>
            </div>
            <div className="calendar-week-events">
              {day.events.length === 0 ? (
                <span className="calendar-week-empty" aria-hidden="true">
                  ·
                </span>
              ) : (
                day.events.map((event) => (
                  <CalendarEventCard key={event.id} event={event} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
