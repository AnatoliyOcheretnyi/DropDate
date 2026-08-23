"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { Icon } from "../../../shared/ui/Icon";
import { useAuth } from "../../../shared/state/auth";

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
    queryFn: async () => {
      const response = await fetch("/api/episodes/continue", {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json();
      return payload.items as Item[];
    },
  });

  // Signed-out visitors have no progress to continue, so the section stays out
  // of the page entirely rather than showing an empty state they cannot fill.
  if (!user) {
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

        {query.isLoading ? (
          <div className="continue-watching__row">
            {Array.from({ length: 4 }).map((_, index) => (
              <span
                key={index}
                className="continue-watching__card continue-watching__card--skeleton"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="section-empty">
            <span className="section-empty__badge" aria-hidden="true">
              <Icon name="circle-play" size={20} />
            </span>
            <div className="section-empty__text">
              <strong>Тут зʼявляться серіали, які ти дивишся</strong>
              <p>
                Познач епізод переглянутим — і ми підхопимо сезон із наступної
                серії.
              </p>
            </div>
            <Link href="/search" className="section-empty__action">
              <Icon name="search" size={16} />
              <span>Знайти серіал</span>
            </Link>
          </div>
        ) : (
          <div className="continue-watching__row">
            {items.map((item) => {
              const total = item.episodeCount;
              const watched = Math.min(item.watchedCount, total || item.watchedCount);
              const percent = total > 0 ? Math.round((watched / total) * 100) : 0;

              return (
                <button
                  key={item.tmdbId}
                  type="button"
                  className="continue-watching__card"
                  onClick={() => router.push(`/title/tv/${item.tmdbId}`)}
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
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
