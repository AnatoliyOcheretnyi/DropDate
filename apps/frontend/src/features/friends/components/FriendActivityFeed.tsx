"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { Suggestion } from "../../../shared/lib/release";
import { PosterCard } from "../../../shared/ui/PosterCard";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { FriendAvatar } from "./FriendAvatar";

export type FriendActivity = {
  type: string;
  actorId: string;
  actorName: string;
  title: string;
  tmdbId: number;
  mediaType: string;
  posterUrl?: string;
  rating?: number;
  createdAt: string;
};

const filters = [
  { value: "all", label: "Усе" },
  { value: "rating", label: "Оцінки" },
  { value: "save", label: "У списках" },
  { value: "recommendation", label: "Поради тобі" },
];

function EventDate({ value }: { value: string }) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return (
    <time dateTime={value} title={date.toLocaleString("uk-UA")}>
      {date.toLocaleDateString("uk-UA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}
    </time>
  );
}

export function FriendActivityFeed({
  items,
  loading,
  refreshing,
  failed,
  retry,
}: {
  items: FriendActivity[];
  loading: boolean;
  refreshing: boolean;
  failed: boolean;
  retry: () => void;
}) {
  const router = useRouter();
  const { getListTypes } = useSavedReleases();
  const [filter, setFilter] = useState("all");
  const visible = items.filter(
    (item) => filter === "all" || item.type === filter,
  );
  return (
    <section className="friend-activity" aria-label="Стрічка активності друзів">
      <div className="friend-activity__toolbar">
        <div
          className="friend-activity__filters"
          role="group"
          aria-label="Тип активності"
        >
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="friend-activity__hint">
          Зберігай знахідки через <span aria-hidden="true">ⓘ</span> на постері
        </p>
      </div>
      <div className="friend-activity__status" role="status">
        {failed ? (
          <span>
            Не вдалося завантажити активність.{" "}
            <button type="button" onClick={retry}>
              Повторити
            </button>
          </span>
        ) : refreshing && !loading ? (
          "Оновлюємо активність…"
        ) : null}
      </div>
      {loading ? (
        <div
          className="friend-activity__grid"
          aria-busy="true"
          aria-label="Завантажуємо активність"
        >
          {[0, 1, 2, 3].map((i) => (
            <div className="friend-activity__skeleton" key={i} />
          ))}
        </div>
      ) : visible.length ? (
        <div className="friend-activity__grid">
          {visible.map((event, index) => {
            const key = `${event.type}:${event.actorId}:${event.mediaType}:${event.tmdbId}:${event.createdAt}`;
            const isTitle =
              event.tmdbId > 0 &&
              (event.mediaType === "movie" || event.mediaType === "tv");
            if (!isTitle)
              return (
                <article className="friend-activity__connection" key={key}>
                  <FriendAvatar label={event.actorName} size="md" />
                  <div>
                    <Link href={`/friends/${event.actorId}`}>
                      {event.actorName}
                    </Link>
                    <p>Тепер у твоєму кіноколі</p>
                  </div>
                  <EventDate value={event.createdAt} />
                  <Link
                    className="friend-activity__profile"
                    href={`/friends/${event.actorId}`}
                  >
                    Переглянути список <span aria-hidden="true">↗</span>
                  </Link>
                </article>
              );
            const title: Suggestion = {
              id: event.tmdbId,
              title: event.title,
              mediaType: event.mediaType as "movie" | "tv",
              posterUrl: event.posterUrl,
            };
            const lists = getListTypes(title);
            return (
              <article
                key={key}
                className="friend-activity__card"
                style={
                  { "--activity-order": Math.min(index, 5) } as CSSProperties
                }
              >
                <header className="friend-activity__actor">
                  <Link
                    href={`/friends/${event.actorId}`}
                    aria-label={`Профіль ${event.actorName}`}
                  >
                    <FriendAvatar label={event.actorName} size="sm" />
                  </Link>
                  <div>
                    <Link href={`/friends/${event.actorId}`}>
                      {event.actorName}
                    </Link>
                    <span>
                      {event.type === "rating"
                        ? "Оцінка друга"
                        : event.type === "recommendation"
                          ? "Радить тобі"
                          : "Додано до списку"}
                    </span>
                  </div>
                  {event.type === "rating" && event.rating != null ? (
                    <strong
                      className="friend-activity__rating"
                      aria-label={`Оцінка друга: ${event.rating} з 10`}
                    >
                      <span aria-hidden="true">★</span> {event.rating}
                      <small>/10</small>
                    </strong>
                  ) : (
                    <span
                      className="friend-activity__event-icon"
                      aria-hidden="true"
                    >
                      {event.type === "recommendation" ? "✦" : "+"}
                    </span>
                  )}
                </header>
                <PosterCard
                  item={title}
                  listTypes={lists}
                  onSelect={(item) =>
                    router.push(`/title/${item.mediaType}/${item.id}`)
                  }
                  imageSizes="(max-width: 520px) 90vw, (max-width: 900px) 44vw, (max-width: 1200px) 30vw, 300px"
                />
                <footer>
                  <EventDate value={event.createdAt} />
                  <span className={lists.length ? "is-saved" : ""}>
                    {lists.length ? "✓ У твоєму списку" : "Знахідка від друга"}
                  </span>
                </footer>
              </article>
            );
          })}
        </div>
      ) : !failed ? (
        <div className="friend-activity__empty">
          <span aria-hidden="true">✦</span>
          <h2>
            {filter === "all"
              ? "Тут з’являться кінознахідки друзів"
              : "Поки немає такої активності"}
          </h2>
          <p>
            {filter === "all"
              ? "Їхні оцінки, поради й нові фільми у списках — усе поруч."
              : "Спробуй інший фільтр або повернись трохи пізніше."}
          </p>
          {filter === "all" ? (
            <Link href="/friends">Знайти друзів ↗</Link>
          ) : (
            <button type="button" onClick={() => setFilter("all")}>
              Показати все
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
