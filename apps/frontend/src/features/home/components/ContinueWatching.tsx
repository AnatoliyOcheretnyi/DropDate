"use client";
import { MovieCardSurface } from "../../../shared/ui/MovieCardSurface";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { Icon } from "../../../shared/ui/Icon";
import { fetchWithAuth, useAuth } from "../../../shared/state/auth";

type Item = {
  tmdbId: number;
  title: string;
  posterUrl: string;
  seasonNumber: number;
  episodeNumber: number;
  watchedCount: number;
  episodeCount: number;
};

/**
 * The series the user is part-way through, newest activity first.
 *
 * Each card leads with the still and a play affordance rather than a poster:
 * the question this row answers is "where was I", not "what is this", so the
 * next episode and the season progress carry the card.
 */
export function ContinueWatching() {
  const router = useRouter();
  const { user, accessToken } = useAuth();

  const query = useQuery({
    queryKey: ["continue-watching", user?.id],
    enabled: Boolean(user && accessToken),
    queryFn: async ({ signal }) => {
      const response = await fetchWithAuth("/api/episodes/continue", {
        signal,
      });
      if (!response.ok)
        throw new Error("Не вдалося завантажити прогрес перегляду");
      const payload = await response.json();
      return (Array.isArray(payload.items) ? payload.items : []) as Item[];
    },
  });

  // Render only when there is actual progress to resume, never an empty rail.
  if (!user || !query.data?.length) {
    return null;
  }

  const items = query.data ?? [];

  return (
    <section
      className="continue-watching trend-bleed"
      aria-labelledby="continue-watching-title"
    >
      <div className="trend-inner">
        <header className="continue-watching__head">
          <div>
            <p className="new-releases__kicker">ПРОДОВЖИТИ ПЕРЕГЛЯД</p>
            <h2 id="continue-watching-title" className="new-releases__title">
              Продовжити перегляд
            </h2>
          </div>
          <Link href="/saved" className="calendar-home__all">
            <span>Уся історія</span>
            <Icon name="history" size={16} />
          </Link>
        </header>

        <div className="continue-watching__row">
          {items.map((item) => {
            const total = item.episodeCount;
            const watched = Math.min(
              item.watchedCount,
              total || item.watchedCount,
            );
            const percent = total > 0 ? Math.round((watched / total) * 100) : 0;

            return (
              <MovieCardSurface tmdbId={item.tmdbId} mediaType={"tv"} title={item.title}
                key={item.tmdbId}
                className="continue-watching__card"
                onActivate={() => router.push(`/title/tv/${item.tmdbId}`)}
              >
                <span className="continue-watching__still">
                  {item.posterUrl ? (
                    <CoverImage
                      src={item.posterUrl}
                      alt=""
                      sizes="248px"
                      ariaHidden
                    />
                  ) : null}
                  <span className="continue-watching__play" aria-hidden="true">
                    <Icon name="play" size={16} />
                  </span>
                </span>

                <span className="continue-watching__body">
                  <strong className="continue-watching__title">
                    {item.title}
                  </strong>
                  <span className="continue-watching__meta">
                    <span className="continue-watching__episode">
                      S{item.seasonNumber} E{item.episodeNumber}
                    </span>
                    <span className="continue-watching__note">
                      Наступна серія
                    </span>
                  </span>

                  {/* Without the season length from TMDB the bar would be a
                        guess, so the card drops it rather than mislead. */}
                  {total > 0 ? (
                    <span className="continue-watching__progress">
                      <span
                        className="continue-watching__track"
                        aria-hidden="true"
                      >
                        <span
                          className="continue-watching__bar"
                          style={{ width: `${percent}%` }}
                        />
                      </span>
                      <span className="continue-watching__count">
                        Сезон {item.seasonNumber} · {watched} з {total} серій
                      </span>
                    </span>
                  ) : null}
                </span>
              </MovieCardSurface>
            );
          })}
        </div>
      </div>
    </section>
  );
}
