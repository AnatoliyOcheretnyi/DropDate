"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppPageShell } from "../../../widgets/AppPageShell";
import { AuthModal } from "../../../widgets/AuthModal";
import { Reveal } from "../../../shared/ui/Reveal";
import { useAuth } from "../../../shared/state/auth";
import { useProfile } from "../hooks/useProfile";
import { useAchievements } from "../hooks/useAchievements";
import { useFollowedPeople } from "../../people/hooks/useFollowedPeople";
import { PeopleSection } from "../../people/components/PeopleSection";
import { TasteTournament } from "../components/TasteTournament";
import { TasteCalibrationCard } from "../components/TasteCalibrationCard";
import { AchievementsSection } from "../components/AchievementsSection";
import { IdentityHeader } from "../components/IdentityHeader";
import { StatRow } from "../components/StatRow";
import { ProfileSettingsSheet } from "../components/ProfileSettingsSheet";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { savedMediaType, savedMetaLine } from "../../saved/utils/savedPresentation";
import type { SavedRelease } from "../../../shared/types/releases";

const PROFILE_TABS = [
  { key: "overview", label: "Огляд" },
  { key: "taste", label: "Смаки" },
  { key: "achievements", label: "Досягнення" },
  { key: "people", label: "Люди" },
] as const;

type ProfileTabKey = (typeof PROFILE_TABS)[number]["key"];

const isSeries = (item: SavedRelease) =>
  item.mediaType === "tv" || item.type === "series";

const inList = (item: SavedRelease, list: string) =>
  (item.listTypes && item.listTypes.length > 0
    ? item.listTypes
    : ["follow"]
  ).includes(list as never);

const parseTab = (value: string | null): ProfileTabKey =>
  PROFILE_TABS.some((tab) => tab.key === value) ? (value as ProfileTabKey) : "overview";

const monthYear = (value?: string) => {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric" }).format(parsed);
};

const fullDate = (value?: string) => {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
};

function ProfileScreenContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken } = useAuth();
  const [isResettingCache, setIsResettingCache] = useState(false);
  const [cacheResetStatus, setCacheResetStatus] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tab, setTabState] = useState<ProfileTabKey>(() =>
    parseTab(searchParams.get("tab"))
  );
  const {
    authLoading,
    blurTimeoutRef,
    handleLogout,
    handleNav,
    handleSearchClose,
    handleSearchToggle,
    handleSubmit,
    handleSuggestionSelect,
    initials,
    isAuthOpen,
    isSearchOpen,
    isSuggestionSaved,
    isFetchingSuggestions,
    saved,
    savedCount,
    setIsAuthOpen,
    setTitle,
    suggestions,
    title,
    user,
  } = useProfile();

  const { people } = useFollowedPeople();
  const { lists: achievementLists, isLoading: achievementsLoading } =
    useAchievements();

  // The tab is addressable, so the avatar menu can link straight to ?tab=people.
  const setTab = useCallback(
    (next: ProfileTabKey) => {
      setTabState(next);
      router.replace(next === "overview" ? "/profile" : `/profile?tab=${next}`, {
        scroll: false,
      });
    },
    [router]
  );

  // The avatar menu links to /profile?tab=people from the profile page itself,
  // where Next keeps the component mounted — so the tab follows the query.
  const tabParam = searchParams.get("tab");
  useEffect(() => {
    setTabState(parseTab(tabParam));
  }, [tabParam]);

  const stats = useMemo(() => {
    const movies = saved.filter((item) => !isSeries(item)).length;
    const watched = saved.filter((item) => inList(item, "watched")).length;
    return { movies, series: saved.length - movies, watched };
  }, [saved]);

  const statTiles = [
    { key: "saved", value: savedCount, label: "у списку" },
    { key: "watched", value: stats.watched, label: "переглянуто" },
    { key: "movies", value: stats.movies, label: "фільмів" },
    { key: "series", value: stats.series, label: "серіалів" },
    { key: "people", value: people.length, label: "людей" },
  ];

  const recent = useMemo(
    () =>
      [...saved]
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
        .slice(0, 6),
    [saved]
  );

  const nextRelease = useMemo(() => {
    const now = Date.now();
    return [...saved]
      .filter((item) => {
        if (!item.nextRelease) {
          return false;
        }
        const parsed = new Date(item.nextRelease).getTime();
        return !Number.isNaN(parsed) && parsed >= now;
      })
      .sort((a, b) => (a.nextRelease ?? "").localeCompare(b.nextRelease ?? ""))[0];
  }, [saved]);

  const memberSince = monthYear(
    [...saved].sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""))[0]
      ?.createdAt
  );

  const handleCacheReset = async () => {
    if (!user?.isSuperuser) {
      return;
    }
    setIsResettingCache(true);
    setCacheResetStatus(null);
    try {
      const response = await fetch("/api/dev/cache/reset", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; cleared?: string[] }
        | null;
      if (!response.ok) {
        throw new Error(payload?.message || "Не вдалося скинути кеш.");
      }
      const cleared = payload?.cleared?.length
        ? `Очищено: ${payload.cleared.join(", ")}.`
        : "Кеш очищено.";
      setCacheResetStatus(`${cleared} Онови сторінку через кілька секунд.`);
    } catch (error) {
      setCacheResetStatus(
        error instanceof Error ? error.message : "Не вдалося скинути кеш."
      );
    } finally {
      setIsResettingCache(false);
    }
  };

  const openTitle = (item: SavedRelease) => {
    if (item.tmdbId) {
      router.push(`/title/${savedMediaType(item)}/${item.tmdbId}`);
    }
  };

  const renderOverview = () => (
    <div className="profile-panel">
      {user?.isSuperuser ? (
        <section className="profile-dev-card">
          <div>
            <p className="trend-kicker">Dev Access</p>
            <h2>Твоя dev-зона</h2>
            <p>
              Тут можна одразу скинути кеш релізів і рекомендацій та примусово
              перевалідувати головну.
            </p>
          </div>
          <div className="profile-dev-card__actions">
            <button
              type="button"
              className="profile-people-manage"
              onClick={() => router.push("/profile/dev")}
            >
              Відкрити dev-сторінку →
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => void handleCacheReset()}
              disabled={isResettingCache}
            >
              {isResettingCache ? "Скидаю кеш..." : "Скинути кеш зараз"}
            </button>
          </div>
          {cacheResetStatus ? (
            <p className="profile-dev-card__status">{cacheResetStatus}</p>
          ) : null}
        </section>
      ) : null}

      <section className="profile-block">
        <div className="profile-block__head">
          <h2>Останні додані</h2>
          <button
            type="button"
            className="profile-people-manage"
            onClick={() => router.push("/saved")}
          >
            Мій список →
          </button>
        </div>
        {recent.length === 0 ? (
          <p className="profile-block__empty">
            Список поки порожній — додай перший тайтл із головної.
          </p>
        ) : (
          <div className="profile-recent">
            {recent.map((item) => (
              <button
                key={item.id}
                type="button"
                className="profile-recent__card"
                onClick={() => openTitle(item)}
              >
                <span className="profile-recent__poster">
                  {item.posterUrl ? (
                    <CoverImage src={item.posterUrl} alt={item.title} sizes="172px" />
                  ) : (
                    <span aria-hidden="true">{item.title.slice(0, 1)}</span>
                  )}
                </span>
                <strong>{item.title}</strong>
                <span className="profile-recent__meta">{savedMetaLine(item)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {nextRelease ? (
        <section className="profile-block">
          <div className="profile-block__head">
            <h2>Найближчий реліз</h2>
          </div>
          <button
            type="button"
            className="profile-next"
            onClick={() => openTitle(nextRelease)}
          >
            <span className="profile-next__poster">
              {nextRelease.posterUrl ? (
                <CoverImage src={nextRelease.posterUrl} alt={nextRelease.title} sizes="92px" />
              ) : (
                <span aria-hidden="true">{nextRelease.title.slice(0, 1)}</span>
              )}
            </span>
            <span className="profile-next__text">
              <strong>{nextRelease.title}</strong>
              <span>{fullDate(nextRelease.nextRelease)}</span>
            </span>
          </button>
        </section>
      ) : null}
    </div>
  );

  const renderTaste = () => (
    <div className="profile-panel">
      {/* Guests get the same layout behind a blur instead of a different
          component under the same name. */}
      <div className={`taste-grid${user ? "" : " taste-grid--locked"}`}>
        <TasteCalibrationCard />
        <TasteTournament kind="genre" title="Жанри" />
        <TasteTournament kind="country" title="Країни" />
      </div>
      {user ? null : (
        <div className="taste-lock">
          <p>Увійди, щоб калібрувати смаки — вибір пар зберігається до акаунта.</p>
          <button type="button" className="btn-pill btn-pill--accent" onClick={() => setIsAuthOpen(true)}>
            Увійти
          </button>
        </div>
      )}
    </div>
  );

  return (
    <main className="page page--profile">
      <AppPageShell
        active="home"
        savedCount={savedCount}
        onChange={handleNav}
        isSearchOpen={isSearchOpen}
        onSearchToggle={handleSearchToggle}
        onSearchClose={handleSearchClose}
        searchOverlay={{
          title,
          isLoading: false,
          isOpen: isSearchOpen,
          onClose: handleSearchClose,
          onChange: setTitle,
          onSubmit: handleSubmit,
          onFocus: () => undefined,
          onBlur: () => {
            blurTimeoutRef.current = setTimeout(() => {}, 150);
          },
          suggestions,
          isFetchingSuggestions,
          onSuggestionSelect: handleSuggestionSelect,
          isSuggestionSaved,
        }}
      >
        <section className="profile-shell">
          <IdentityHeader
            initials={initials}
            title={user ? `@${user.username || "без юзернейму"}` : "Персональний профіль"}
            meta={[
              user?.email,
              memberSince ? `У DropDate з ${memberSince}` : null,
            ]}
            action={
              user ? (
                <button
                  type="button"
                  className="identity-header__icon-btn"
                  aria-label="Налаштування профілю"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9 4a8.7 8.7 0 0 0-.1-1.3l2-1.5-2-3.4-2.3 1a8.8 8.8 0 0 0-2.3-1.3L15.9 3h-3.8l-.4 2.5a8.8 8.8 0 0 0-2.3 1.3l-2.3-1-2 3.4 2 1.5a8.9 8.9 0 0 0 0 2.6l-2 1.5 2 3.4 2.3-1a8.8 8.8 0 0 0 2.3 1.3l.4 2.5h3.8l.4-2.5a8.8 8.8 0 0 0 2.3-1.3l2.3 1 2-3.4-2-1.5c.06-.43.1-.86.1-1.3Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-pill btn-pill--accent"
                  onClick={() => setIsAuthOpen(true)}
                  disabled={authLoading}
                >
                  Увійти
                </button>
              )
            }
          />

          <StatRow items={statTiles} />

          <div className="profile-tabs-row" role="tablist" aria-label="Розділи профілю">
            {PROFILE_TABS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                role="tab"
                aria-selected={tab === entry.key}
                className={`profile-tab-btn${tab === entry.key ? " is-active" : ""}`}
                onClick={() => setTab(entry.key)}
              >
                {entry.label}
              </button>
            ))}
          </div>

          <Reveal key={tab}>
            {tab === "overview" ? renderOverview() : null}
            {tab === "taste" ? renderTaste() : null}
            {tab === "achievements" ? (
              <div className="profile-panel">
                <AchievementsSection
                  lists={achievementLists}
                  isLoading={achievementsLoading}
                />
              </div>
            ) : null}
            {tab === "people" ? (
              <div className="profile-panel">
                <PeopleSection />
              </div>
            ) : null}
          </Reveal>
        </section>
      </AppPageShell>

      <ProfileSettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSignOut={handleLogout}
      />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </main>
  );
}

export function ProfileScreen() {
  return (
    <Suspense fallback={<main className="page page--profile" />}>
      <ProfileScreenContent />
    </Suspense>
  );
}
