"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppPageShell } from "../../../widgets/AppPageShell";
import { Reveal } from "../../../shared/ui/Reveal";
import { AuthorizedSavedList } from "../../saved/components/AuthorizedSavedList";
import { SavedActiveFilters } from "../../saved/components/SavedActiveFilters";
import { SavedControlPanel } from "../../saved/components/SavedControlPanel";
import { useSavedFilters } from "../../saved/hooks/useSavedFilters";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { savedMediaType } from "../../saved/utils/savedPresentation";
import { IdentityHeader } from "../../profile/components/IdentityHeader";
import { StatRow } from "../../profile/components/StatRow";
import { PeopleSection } from "../../people/components/PeopleSection";
import { AchievementsSection } from "../../profile/components/AchievementsSection";
import type { FollowedPerson } from "../../people/store/followedPeopleStore";
import { useFriendProfile } from "../hooks/useFriendProfile";
import type { SavedRelease } from "../../../shared/types/releases";
import type { ReleaseInfo, Suggestion } from "../../../shared/lib/release";

const listsOf = (item: SavedRelease) =>
  item.listTypes && item.listTypes.length > 0 ? item.listTypes : ["follow"];

const isSeries = (item: SavedRelease) =>
  item.mediaType === "tv" || item.type === "series";

const toSuggestion = (item: SavedRelease): Suggestion => ({
  id: item.tmdbId as number,
  title: item.title,
  mediaType: savedMediaType(item),
  posterUrl: item.posterUrl,
});

const toRelease = (item: SavedRelease): ReleaseInfo => ({
  title: item.title,
  type: item.type,
  nextRelease: item.nextRelease,
  source: item.source,
  posterUrl: item.posterUrl,
  backdropUrl: item.backdropUrl,
  status: item.status,
});

const formatSince = (value?: string) => {
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

function FriendProfileScreenContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const friendId = params.id ?? "";
  const {
    saved: mySaved,
    savedCount,
    setSuggestionLists,
    getListTypes,
  } = useSavedReleases();
  const {
    friendship,
    isResolvingFriendship,
    saved,
    isSavedLoading,
    follows,
    isFollowsLoading,
    achievements,
    isAchievementsLoading,
  } = useFriendProfile(friendId);
  const [section, setSection] = useState<"titles" | "people" | "awards">("titles");
  const [onlyMutual, setOnlyMutual] = useState(false);

  const mutualIds = useMemo(
    () => new Set(mySaved.map((item) => item.id)),
    [mySaved]
  );

  const mutual = useMemo(
    () => saved.filter((item) => mutualIds.has(item.id)),
    [mutualIds, saved]
  );

  // The mutual tile is a filter over the same grid, which is what the old
  // "8 posters and +N" block could never show in full.
  const source = onlyMutual ? mutual : saved;
  const filters = useSavedFilters(source, { basePath: `/friends/${friendId}` });

  const stats = useMemo(() => {
    const movies = saved.filter((item) => !isSeries(item)).length;
    return {
      total: saved.length,
      movies,
      series: saved.length - movies,
      watched: saved.filter((item) => listsOf(item).includes("watched")).length,
    };
  }, [saved]);

  const friendPeople = useMemo<FollowedPerson[]>(
    () =>
      follows.map((item) => ({
        tmdbId: item.personId,
        name: item.name,
        role: item.role,
        profileUrl: item.profileUrl,
        knownFor: item.knownFor,
        subscribed: item.subscribed,
        followedAt: 0,
      })),
    [follows]
  );

  const label = friendship?.user.username || friendship?.user.email || "";
  const since = formatSince(friendship?.respondedAt);
  const notFound = !isResolvingFriendship && !friendship;

  const handleAdd = (item: SavedRelease) => {
    if (!item.tmdbId || !item.mediaType) {
      return;
    }
    const suggestion = toSuggestion(item);
    const mine = getListTypes(suggestion);
    if (mine.includes("watchlist")) {
      return;
    }
    setSuggestionLists(suggestion, [...mine, "watchlist"], toRelease(item));
  };

  const statTiles = [
    { key: "total", value: stats.total, label: "у списку" },
    { key: "watched", value: stats.watched, label: "переглянуто" },
    { key: "movies", value: stats.movies, label: "фільмів" },
    { key: "series", value: stats.series, label: "серіалів" },
    {
      key: "mutual",
      value: mutual.length,
      label: onlyMutual ? "спільні · показано" : "спільних з тобою",
      isActive: onlyMutual,
      hint: "Показати лише спільні з тобою тайтли",
      onClick: () => setOnlyMutual((prev) => !prev),
    },
  ];

  const renderTitles = () => {
    if (isSavedLoading) {
      return (
        <div className="saved-grid">
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <div key={key} className="saved-card saved-card--loading" aria-hidden="true" />
          ))}
        </div>
      );
    }
    if (saved.length === 0) {
      return (
        <div className="friends-empty">
          У {label ? `@${label}` : "друга"} поки порожній список.
        </div>
      );
    }
    if (filters.displayItems.length === 0) {
      return (
        <div className="friends-empty">
          Нічого не знайшлось за цими фільтрами.{" "}
          <button
            type="button"
            className="friends-empty__reset"
            onClick={() => {
              setOnlyMutual(false);
              filters.resetFilters();
            }}
          >
            Скинути
          </button>
        </div>
      );
    }
    return (
      <Reveal key={`${filters.tab}-${filters.view}-${onlyMutual}`}>
        <AuthorizedSavedList
          items={filters.displayItems}
          onRemove={() => undefined}
          groupByDate={filters.sortKey === "release"}
          showBadges={filters.tab === "all"}
          view={filters.view}
          readOnly
          onAdd={handleAdd}
          isAdded={(item) =>
            Boolean(item.tmdbId) && getListTypes(toSuggestion(item)).length > 0
          }
        />
      </Reveal>
    );
  };

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
          <button
            type="button"
            className="friend-profile-back"
            onClick={() => router.push("/friends")}
          >
            ← Усі друзі
          </button>

          {notFound ? (
            <div className="friends-empty">
              Це не твій друг — можливо, запит ще не прийнято.
            </div>
          ) : !friendship ? (
            <div className="friend-profile-header friend-profile-header--loading" aria-hidden="true" />
          ) : (
            <>
              <IdentityHeader
                tone="neutral"
                initials={(label.slice(0, 2) || "??").toUpperCase()}
                title={`@${friendship.user.username || "без юзернейму"}`}
                meta={[friendship.user.email, since ? `Друзі з ${since}` : null]}
                action={
                  <button
                    type="button"
                    className="btn-pill btn-pill--accent"
                    onClick={() => router.push(`/games/friend-taste?friendId=${friendId}`)}
                  >
                    Порівняти смаки →
                  </button>
                }
              />

              <StatRow items={statTiles} isLoading={isSavedLoading} />

              <div className="saved-sections-switch" role="tablist" aria-label="Розділи">
                <button
                  type="button"
                  role="tab"
                  aria-selected={section === "titles"}
                  className={`saved-switch-btn${section === "titles" ? " is-active" : ""}`}
                  onClick={() => setSection("titles")}
                >
                  Тайтли
                  {saved.length > 0 ? <span>{saved.length}</span> : null}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={section === "people"}
                  className={`saved-switch-btn${section === "people" ? " is-active" : ""}`}
                  onClick={() => setSection("people")}
                >
                  Люди
                  {friendPeople.length > 0 ? <span>{friendPeople.length}</span> : null}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={section === "awards"}
                  className={`saved-switch-btn${section === "awards" ? " is-active" : ""}`}
                  onClick={() => setSection("awards")}
                >
                  Нагороди
                </button>
              </div>

              {section === "awards" ? (
                <Reveal key="awards">
                  <AchievementsSection
                    lists={achievements}
                    isLoading={isAchievementsLoading}
                  />
                </Reveal>
              ) : section === "people" ? (
                <Reveal key="people">
                  <PeopleSection
                    people={friendPeople}
                    isLoading={isFollowsLoading}
                    readOnly
                    ownerLabel={label ? `@${label}` : "Друг"}
                  />
                </Reveal>
              ) : (
                <>
                  {saved.length > 0 ? (
                    <>
                      <SavedControlPanel
                        tab={filters.tab}
                        tabCounts={filters.tabCounts}
                        onTabChange={filters.setTab}
                        isAuthenticated
                        genreFacets={filters.genreFacets}
                        selectedGenres={filters.genres}
                        onToggleGenre={filters.toggleGenre}
                        onResetGenres={filters.resetFilters}
                        query={filters.query}
                        onQueryChange={filters.setQuery}
                        sortKey={filters.sortKey}
                        direction={filters.direction}
                        onSortChange={filters.setSortKey}
                        onToggleDirection={filters.toggleDirection}
                        view={filters.view}
                        onViewChange={filters.setView}
                        shownCount={filters.displayItems.length}
                        totalCount={filters.tabItems.length}
                        isFiltered={
                          filters.genres.length > 0 ||
                          filters.query.trim().length > 0 ||
                          onlyMutual
                        }
                        searchPlaceholder={`Пошук у списку ${label ? `@${label}` : "друга"}`}
                      />

                      <SavedActiveFilters
                        genres={filters.genres}
                        query={filters.query}
                        sortKey={filters.sortKey}
                        direction={filters.direction}
                        isSortPinned={filters.isSortPinned}
                        onRemoveGenre={filters.toggleGenre}
                        onClearQuery={() => filters.setQuery("")}
                        onReset={() => {
                          setOnlyMutual(false);
                          filters.resetFilters();
                        }}
                      />
                    </>
                  ) : null}

                  {renderTitles()}
                </>
              )}
            </>
          )}
        </section>
      </AppPageShell>
    </main>
  );
}

export function FriendProfileScreen() {
  return (
    <Suspense fallback={<main className="page page--friend-profile" />}>
      <FriendProfileScreenContent />
    </Suspense>
  );
}
