"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppPageShell } from "../../../widgets/AppPageShell";
import { Reveal } from "../../../shared/ui/Reveal";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { AchievementsSection } from "../../profile/components/AchievementsSection";
import { FriendAvatar } from "../components/FriendAvatar";
import { FriendSavedGrid } from "../components/FriendSavedGrid";
import { useFriendProfile } from "../hooks/useFriendProfile";
import type { ListType, SavedRelease } from "../../../shared/types/releases";

const LIST_TABS: { type: ListType; label: string }[] = [
  { type: "watchlist", label: "Хочу подивитись" },
  { type: "favorite", label: "Улюблене" },
  { type: "watched", label: "Переглянуто" },
  { type: "liked", label: "Сподобалось" },
  { type: "disliked", label: "Не сподобалось" },
  { type: "follow", label: "Підписка" },
];

const listsOf = (item: SavedRelease): ListType[] =>
  item.listTypes && item.listTypes.length > 0 ? item.listTypes : ["follow"];

const isSeries = (item: SavedRelease) => item.mediaType === "tv" || item.type === "series";

const formatSince = (value?: string) => {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric" }).format(parsed);
};

export function FriendProfileScreen() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const friendId = params.id ?? "";
  const { saved: mySaved, savedCount } = useSavedReleases();
  const {
    friendship,
    isResolvingFriendship,
    saved,
    isSavedLoading,
    achievements,
    isAchievementsLoading,
  } = useFriendProfile(friendId);
  const [tab, setTab] = useState<"lists" | "awards">("lists");
  const [activeList, setActiveList] = useState<ListType>("watchlist");

  const counts = useMemo(() => {
    const map = new Map<ListType, number>();
    saved.forEach((item) => {
      listsOf(item).forEach((entry) => map.set(entry, (map.get(entry) ?? 0) + 1));
    });
    return map;
  }, [saved]);

  const activeItems = useMemo(
    () => saved.filter((item) => listsOf(item).includes(activeList)),
    [saved, activeList]
  );

  const mutual = useMemo(() => {
    const mine = new Set(mySaved.map((item) => item.id));
    return saved.filter((item) => mine.has(item.id));
  }, [mySaved, saved]);

  const stats = useMemo(() => {
    const movies = saved.filter((item) => !isSeries(item)).length;
    return {
      total: saved.length,
      movies,
      series: saved.length - movies,
      watched: saved.filter((item) => listsOf(item).includes("watched")).length,
    };
  }, [saved]);

  const statTiles = [
    { value: stats.total, label: "у бібліотеці", tone: "green" },
    { value: stats.movies, label: "фільмів", tone: "blue" },
    { value: stats.series, label: "серіалів", tone: "violet" },
    { value: stats.watched, label: "переглянуто", tone: "amber" },
    { value: mutual.length, label: "спільних з тобою", tone: "pink" },
  ];

  const label = friendship?.user.username || friendship?.user.email || "";
  const since = formatSince(friendship?.respondedAt);
  const notFound = !isResolvingFriendship && !friendship;
  const mutualPreview = mutual.slice(0, 8);

  return (
    <main className="page page--friend-profile">
      <AppPageShell
        active="home"
        savedCount={savedCount}
        onChange={(view) => router.push(view === "saved" ? "/saved" : "/")}
        isSearchOpen={false}
        onSearchToggle={() => undefined}
        onSearchClose={() => undefined}
      >
        <div className="friends-backdrop" aria-hidden="true" />
        <section className="friends-shell">
          <button type="button" className="friend-profile-back" onClick={() => router.push("/friends")}>
            ← Усі друзі
          </button>

          {notFound ? (
            <div className="friends-empty">Це не твій друг — можливо, запит ще не прийнято.</div>
          ) : !friendship ? (
            <div className="friend-profile-header friend-profile-header--loading" aria-hidden="true" />
          ) : (
            <Reveal>
              <div className="friend-profile-header">
                <FriendAvatar label={label} size="xl" />
                <div className="friend-profile-header__meta">
                  <h1>@{friendship.user.username || "без юзернейму"}</h1>
                  <span>{friendship.user.email}</span>
                  {since ? (
                    <span className="friend-profile-header__since">Друзі з {since}</span>
                  ) : null}
                </div>
              </div>

              <div className="profile-metrics friend-profile-metrics">
                {statTiles.map((tile) => (
                  <div key={tile.label} className={`profile-metric profile-metric--${tile.tone}`}>
                    <strong>{isSavedLoading ? "…" : tile.value}</strong>
                    <span>{tile.label}</span>
                  </div>
                ))}
              </div>

              {mutualPreview.length > 0 ? (
                <div className="friend-mutual">
                  <div className="friend-mutual__head">
                    <p className="trend-kicker">Перетин смаків</p>
                    <h2>Спільні з тобою</h2>
                  </div>
                  <div className="friend-mutual__row">
                    {mutualPreview.map((item) => {
                      const mediaType = item.mediaType || (item.type === "movie" ? "movie" : "tv");
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className="friend-mutual__poster"
                          title={item.title}
                          onClick={() => {
                            if (item.tmdbId) {
                              router.push(`/title/${mediaType}/${item.tmdbId}`);
                            }
                          }}
                        >
                          {item.posterUrl ? (
                            <CoverImage src={item.posterUrl} alt={item.title} sizes="120px" />
                          ) : (
                            <span>{item.title.slice(0, 1)}</span>
                          )}
                        </button>
                      );
                    })}
                    {mutual.length > mutualPreview.length ? (
                      <div className="friend-mutual__more">+{mutual.length - mutualPreview.length}</div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="friend-tabs">
                <button
                  type="button"
                  className={tab === "lists" ? "is-active" : ""}
                  onClick={() => setTab("lists")}
                >
                  Списки
                </button>
                <button
                  type="button"
                  className={tab === "awards" ? "is-active" : ""}
                  onClick={() => setTab("awards")}
                >
                  Нагороди
                </button>
              </div>

              {tab === "lists" ? (
                <div className="friend-tab-panel" key="lists">
                  <div className="friend-list-chips">
                    {LIST_TABS.map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        className={`friend-list-chip${activeList === item.type ? " is-active" : ""}`}
                        onClick={() => setActiveList(item.type)}
                      >
                        {item.label} <b>{counts.get(item.type) ?? 0}</b>
                      </button>
                    ))}
                  </div>
                  {isSavedLoading ? (
                    <div className="friends-grid">
                      {[0, 1, 2].map((key) => (
                        <div key={key} className="friend-card friend-card--loading" aria-hidden="true" />
                      ))}
                    </div>
                  ) : (
                    <FriendSavedGrid items={activeItems} />
                  )}
                </div>
              ) : (
                <div className="friend-tab-panel" key="awards">
                  <AchievementsSection lists={achievements} isLoading={isAchievementsLoading} />
                </div>
              )}
            </Reveal>
          )}
        </section>
      </AppPageShell>
    </main>
  );
}
