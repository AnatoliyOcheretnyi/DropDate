"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppPageShell } from "../../../widgets/AppPageShell";
import { AuthModal } from "../../../widgets/AuthModal";
import { Reveal } from "../../../shared/ui/Reveal";
import { useAuth } from "../../../shared/state/auth";
import { useProfile } from "../hooks/useProfile";
import { useTasteRanking } from "../hooks/useTasteRanking";
import { useAchievements } from "../hooks/useAchievements";
import { useFollowedPeople } from "../../people/hooks/useFollowedPeople";
import { ProfileCard } from "../components/ProfileCard";
import { TasteRanker } from "../components/TasteRanker";
import { TasteTournament } from "../components/TasteTournament";
import { TasteCalibrationCard } from "../components/TasteCalibrationCard";
import { AchievementsSection } from "../components/AchievementsSection";
import { UsernameEditor } from "../../friends/components/UsernameEditor";
import type { SavedRelease } from "../../../shared/types/releases";

const isSeries = (item: SavedRelease) =>
  item.mediaType === "tv" || item.type === "series";

const inList = (item: SavedRelease, list: string) =>
  (item.listTypes && item.listTypes.length > 0
    ? item.listTypes
    : ["follow"]
  ).includes(list as never);

export function ProfileScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [isResettingCache, setIsResettingCache] = useState(false);
  const [cacheResetStatus, setCacheResetStatus] = useState<string | null>(null);
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
    listCopy,
    saved,
    savedCount,
    setIsAuthOpen,
    setTitle,
    suggestions,
    title,
    user,
  } = useProfile();

  const { genres, countries, reorder, reset } = useTasteRanking();
  const { people } = useFollowedPeople();
  const { lists: achievementLists, isLoading: achievementsLoading } =
    useAchievements();

  const stats = useMemo(() => {
    const movies = saved.filter((item) => !isSeries(item)).length;
    const series = saved.length - movies;
    const watched = saved.filter((item) => inList(item, "watched")).length;
    const rated = saved
      .map((item) => item.userRating)
      .filter((value): value is number => typeof value === "number");
    const avg =
      rated.length > 0
        ? Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 10) / 10
        : 0;
    return { movies, series, watched, avg };
  }, [saved]);

  const statTiles = [
    { value: savedCount, label: "у бібліотеці", tone: "green" },
    { value: stats.movies, label: "фільмів", tone: "blue" },
    { value: stats.series, label: "серіалів", tone: "violet" },
    { value: stats.watched, label: "переглянуто", tone: "amber" },
    {
      value: stats.avg > 0 ? `${stats.avg}` : "—",
      label: "середня оцінка",
      tone: "pink",
    },
  ];

  const peoplePreview = people.slice(0, 8);

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
          <div className="profile-hero">
            <div className="profile-hero-copy">
              <p className="eyebrow">Твій простір</p>
              <h1>{user ? "Твій профіль" : "Персональний профіль"}</h1>
              <p>Твоя статистика, смаки та люди, за якими ти стежиш.</p>
            </div>
            <ProfileCard
              initials={initials}
              email={user?.email || null}
              loginPrompt={listCopy.loginPrompt}
              authLoading={authLoading}
              isAuthenticated={Boolean(user)}
              onSignOut={handleLogout}
              onSignIn={() => setIsAuthOpen(true)}
            />
            {user ? <UsernameEditor /> : null}
          </div>

          {user?.isSuperuser ? (
            <Reveal>
              <section className="profile-dev-card">
                <div>
                  <p className="trend-kicker">Dev Access</p>
                  <h2>Твоя dev-зона</h2>
                  <p>
                    Тут можна одразу скинути кеш релізів і рекомендацій та
                    примусово перевалідувати головну.
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
            </Reveal>
          ) : null}

          <Reveal>
            <div className="profile-metrics">
              {statTiles.map((tile) => (
                <div
                  key={tile.label}
                  className={`profile-metric profile-metric--${tile.tone}`}
                >
                  <strong>{tile.value}</strong>
                  <span>{tile.label}</span>
                </div>
              ))}
            </div>
          </Reveal>

          {user ? (
            <Reveal>
              <div className="profile-section-head">
                <div>
                  <p className="trend-kicker">Твій прогрес</p>
                  <h2>Досягнення</h2>
                </div>
              </div>
              <AchievementsSection
                lists={achievementLists}
                isLoading={achievementsLoading}
              />
            </Reveal>
          ) : null}

          <Reveal>
            <div className="profile-section-head">
              <div>
                <p className="trend-kicker">Що тобі заходить</p>
                <h2>Смаки</h2>
              </div>
              <p className="profile-section-hint">
                Обирай між парами — рейтинг ставатиме точнішим і впливатиме
                на рекомендації без жорстких фільтрів.
              </p>
            </div>
            <div className="taste-grid">
              {user ? (
                <>
                  <TasteCalibrationCard />
                  <TasteTournament kind="genre" title="Жанри" />
                  <TasteTournament kind="country" title="Країни" />
                </>
              ) : (
                <>
                  <TasteRanker
                kind="genre"
                title="Жанри"
                kicker="Перетягни, щоб ранжувати"
                items={genres}
                onReorder={reorder}
                onReset={reset}
              />
                  <TasteRanker
                kind="country"
                title="Країни"
                kicker="Перетягни, щоб ранжувати"
                items={countries}
                onReorder={reorder}
                onReset={reset}
                  />
                </>
              )}
            </div>
          </Reveal>

          <Reveal>
            <div className="profile-section-head">
              <div>
                <p className="trend-kicker">Стежиш за творцями</p>
                <h2>Люди</h2>
              </div>
              <button
                type="button"
                className="profile-people-manage"
                onClick={() => router.push("/saved")}
              >
                Керувати →
              </button>
            </div>
            {peoplePreview.length === 0 ? (
              <div className="profile-people-empty">
                Ще ні за ким не стежиш. Відкрий сторінку фільму й познач акторів,
                щоб не пропустити їхні нові релізи.
              </div>
            ) : (
              <div className="profile-people-row">
                {peoplePreview.map((person) => (
                  <div key={person.tmdbId} className="profile-people-chip">
                    <div className="profile-people-avatar">
                      {person.profileUrl ? (
                        <img
                          src={person.profileUrl}
                          alt={person.name}
                          loading="lazy"
                        />
                      ) : (
                        <span aria-hidden="true">{person.name.slice(0, 1)}</span>
                      )}
                    </div>
                    <span>{person.name}</span>
                  </div>
                ))}
                {people.length > peoplePreview.length ? (
                  <div className="profile-people-more">
                    +{people.length - peoplePreview.length}
                  </div>
                ) : null}
              </div>
            )}
          </Reveal>
        </section>
      </AppPageShell>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </main>
  );
}
