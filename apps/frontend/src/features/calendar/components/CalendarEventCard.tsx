"use client";
import { MovieCardSurface } from "../../../shared/ui/MovieCardSurface";


import { useRouter } from "next/navigation";
import { getReleaseStatusLabel } from "../../../shared/lib/release";
import { CoverImage } from "../../../shared/ui/CoverImage";
import type { CalendarEvent } from "../hooks/useCalendarReleases";

type Props = {
  event: CalendarEvent;
  variant?: "card" | "pill";
};

export function CalendarEventCard({ event, variant = "card" }: Props) {
  const router = useRouter();
  const imageUrl = event.posterUrl || event.backdropUrl;

  const open = () => {
    if (event.tmdbId) {
      router.push(`/title/${event.mediaType}/${event.tmdbId}`);
    } else {
      router.push(`/search?query=${encodeURIComponent(event.title)}`);
    }
  };

  if (variant === "pill") {
    return (
      <MovieCardSurface tmdbId={event.tmdbId} mediaType={event.mediaType}
        className="calendar-event-pill"
        onActivate={open}
        title={event.title}
      >
        <span className="calendar-event-pill-thumb" aria-hidden="true">
          {imageUrl ? (
            <CoverImage src={imageUrl} alt="" sizes="24px" ariaHidden />
          ) : (
            <span>{event.title.slice(0, 1)}</span>
          )}
        </span>
        <span className="calendar-event-pill-title">{event.title}</span>
      </MovieCardSurface>
    );
  }

  return (
    <MovieCardSurface tmdbId={event.tmdbId} mediaType={event.mediaType}
      className="calendar-event-card"
      onActivate={open}
      title={event.title}
    >
      <span className="calendar-event-card-thumb" aria-hidden="true">
        {imageUrl ? (
          <CoverImage src={imageUrl} alt="" sizes="38px" ariaHidden />
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
    </MovieCardSurface>
  );
}
