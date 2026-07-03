"use client";

import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { getReleaseStatusLabel } from "../../../shared/lib/release";
import type { CalendarEvent } from "../hooks/useCalendarReleases";

type Props = {
  event: CalendarEvent;
  variant?: "card" | "pill";
};

export function CalendarEventCard({ event, variant = "card" }: Props) {
  const router = useRouter();
  const imageUrl = event.posterUrl || event.backdropUrl;

  const open = (e: MouseEvent) => {
    e.stopPropagation();
    if (event.tmdbId) {
      router.push(`/title/${event.mediaType}/${event.tmdbId}`);
    } else {
      router.push(`/search?query=${encodeURIComponent(event.title)}`);
    }
  };

  if (variant === "pill") {
    return (
      <button
        type="button"
        className="calendar-event-pill"
        onClick={open}
        title={event.title}
      >
        <span className="calendar-event-pill-thumb" aria-hidden="true">
          {imageUrl ? (
            <img src={imageUrl} alt="" loading="lazy" />
          ) : (
            <span>{event.title.slice(0, 1)}</span>
          )}
        </span>
        <span className="calendar-event-pill-title">{event.title}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="calendar-event-card"
      onClick={open}
      title={event.title}
    >
      <span className="calendar-event-card-thumb" aria-hidden="true">
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" />
        ) : (
          <span>{event.title.slice(0, 1)}</span>
        )}
      </span>
      <span className="calendar-event-card-body">
        <span className="calendar-event-card-title">{event.title}</span>
        <span className="calendar-event-card-meta">
          <span className="calendar-event-card-type">
            {event.mediaType === "movie" ? "Фільм" : "Серіал"}
          </span>
          <span className="calendar-event-card-status">
            {getReleaseStatusLabel(event.status, event.type)}
          </span>
        </span>
      </span>
    </button>
  );
}
