"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppPageShell } from "../../../widgets/AppPageShell";
import { AuthorizedSavedList } from "../components/AuthorizedSavedList";
import { SavedActiveFilters } from "../components/SavedActiveFilters";
import { SavedControlPanel } from "../components/SavedControlPanel";
import { SavedEmpty } from "../components/SavedEmpty";
import { copy } from "../../../shared/lib/strings";
import { LIST_META } from "../../../shared/lib/listMeta";
import { useSavedPage } from "../hooks/useSavedPage";
import { useSavedFilters } from "../hooks/useSavedFilters";
import { useAuth } from "../../../shared/state/auth";
import type { ListType, SavedRelease } from "../../../shared/types/releases";
import type { ReleaseInfo, Suggestion } from "../../../shared/lib/release";
import { Reveal } from "../../../shared/ui/Reveal";
import { PeopleSection } from "../../people/components/PeopleSection";
import { useFollowedPeople } from "../../people/hooks/useFollowedPeople";
import { savedMediaType } from "../utils/savedPresentation";

const RATED_LISTS: ListType[] = ["favorite", "liked", "watched", "disliked"];

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

function SavedScreenContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [section, setSection] = useState<"titles" | "people">("titles");
  const { people: followedPeople } = useFollowedPeople();
  const {
    blurTimeoutRef,
    handleRefreshAllClick,
    handleSearchClose,
    handleSearchToggle,
    handleSubmit,
    handleSuggestionSelect,
    isFetchingSuggestions,
    isRefreshing,
    isSearchOpen,
    isStorageReady,
    isSuggestionSaved,
    refreshMessage,
    removeRelease,
    saved,
    savedCount,
    setSuggestionLists,
    setTitle,
    suggestions,
    title,
    updateListStats,
  } = useSavedPage();

  const filters = useSavedFilters(saved);

  const handleChangeLists = (item: SavedRelease, next: ListType[]) => {
    if (!item.tmdbId || !item.mediaType) {
      return;
    }
    if (next.length === 0) {
      removeRelease(item.id);
      return;
    }
    setSuggestionLists(toSuggestion(item), next, toRelease(item));
  };

  const handleRate = (item: SavedRelease, rating: number) => {
    if (!item.tmdbId || !item.mediaType) {
      return;
    }
    // On the union tab the rating belongs to whichever verdict list the title
    // already sits in; otherwise it goes to the list being viewed.
    const ownLists = item.listTypes ?? [];
    const listType: ListType =
      filters.tab !== "all" && RATED_LISTS.includes(filters.tab as ListType)
        ? (filters.tab as ListType)
        : (ownLists.find((entry) => RATED_LISTS.includes(entry)) ?? "watched");
    updateListStats(toSuggestion(item), listType, { userRating: rating });
  };

  // Library-wide, never per tab: swapping the numbers under the user mid-click
  // is what made the old stat tiles unreadable.
  const weekCount = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    const day = start.getDay();
    start.setDate(start.getDate() + ((day === 0 ? -6 : 1) - day));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return saved.filter((item) => {
      if (!item.nextRelease) {
        return false;
      }
      const parsed = new Date(item.nextRelease);
      if (Number.isNaN(parsed.getTime())) {
        return false;
      }
      return parsed >= start && parsed < end;
    }).length;
  }, [saved]);

  const seriesCount = useMemo(
    () => saved.filter((item) => savedMediaType(item) === "tv").length,
    [saved],
  );

  const activeListLabel =
    filters.tab === "all"
      ? "Усі"
      : (LIST_META.find((meta) => meta.type === filters.tab)?.label ?? "");

  const filterSummary = [
    ...filters.genres.map((genre) => `«${genre}»`),
    filters.query.trim() ? `«${filters.query.trim()}»` : "",
  ]
    .filter(Boolean)
    .join(" + ");

  const renderTitles = () => {
    if (!isStorageReady) {
      return (
        <div className="saved-empty">
          <p>{copy.hints.loadingList}</p>
        </div>
      );
    }
    if (saved.length === 0) {
      return <SavedEmpty kind="library" onAction={() => router.push("/")} />;
    }
    if (filters.tabItems.length === 0) {
      return (
        <SavedEmpty
          kind="list"
          listLabel={activeListLabel}
          onAction={() => filters.setTab("all")}
        />
      );
    }
    if (filters.displayItems.length === 0) {
      return (
        <SavedEmpty
          kind="filters"
          filterSummary={filterSummary}
          onAction={filters.resetFilters}
        />
      );
    }
    return (
      <Reveal key={`${filters.tab}-${filters.view}`}>
        <AuthorizedSavedList
          items={filters.displayItems}
          onRemove={(item) => removeRelease(item.id)}
          actionsDisabled={!isStorageReady}
          // Sections are a property of the ordering, not of the tab: "sorted by
          // rating" and "grouped by date" cannot both be true.
          groupByDate={filters.sortKey === "release"}
          onChangeLists={handleChangeLists}
          onRate={handleRate}
          showBadges={filters.tab === "all"}
          view={filters.view}
        />
      </Reveal>
    );
  };

  return (
    <main className="page page--saved">
      <AppPageShell
        active="saved"
        savedCount={savedCount}
        onChange={(view) => {
          if (view === "saved") {
            return;
          }
          router.push("/");
        }}
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
            blurTimeoutRef.current = setTimeout(() => {
              // noop
            }, 150);
          },
          suggestions,
          isFetchingSuggestions,
          onSuggestionSelect: handleSuggestionSelect,
          isSuggestionSaved,
        }}
      >
        <section className="saved">
          <div className="saved-hero">
            <div className="saved-hero-copy">
              <p className="eyebrow">Персональна бібліотека</p>
              <h1>Мій список</h1>
              <p>Усе, що ти відстежуєш, плануєш подивитися або вже оцінив.</p>
            </div>
            <div className="saved-hero-side">
              <div className="saved-stat">
                <strong>{savedCount}</strong>
                <span>тайтлів</span>
              </div>
              <div className="saved-stat">
                <strong>{weekCount}</strong>
                <span>цього тижня</span>
              </div>
              <div className="saved-stat">
                <strong>{seriesCount}</strong>
                <span>серіалів</span>
              </div>
              <button
                type="button"
                className="saved-refresh"
                onClick={handleRefreshAllClick}
                disabled={!isStorageReady || saved.length === 0 || isRefreshing}
              >
                <span aria-hidden="true">↻</span>
                {isRefreshing ? copy.actions.updating : copy.actions.updateAll}
              </button>
            </div>
          </div>

          {refreshMessage ? (
            <p className="saved-refresh-message">{refreshMessage}</p>
          ) : null}

          <div
            className="saved-sections-switch"
            role="tablist"
            aria-label="Розділи"
          >
            <button
              type="button"
              role="tab"
              aria-selected={section === "titles"}
              className={`saved-switch-btn${
                section === "titles" ? " is-active" : ""
              }`}
              onClick={() => setSection("titles")}
            >
              Тайтли
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === "people"}
              className={`saved-switch-btn${
                section === "people" ? " is-active" : ""
              }`}
              onClick={() => setSection("people")}
            >
              Люди
              {followedPeople.length > 0 ? (
                <span>{followedPeople.length}</span>
              ) : null}
            </button>
          </div>

          {section === "people" ? (
            <Reveal>
              <PeopleSection />
            </Reveal>
          ) : (
            <>
              {/* An empty library has nothing to filter: the empty state is the
                  whole screen until the first title is saved. */}
              {isStorageReady && saved.length > 0 ? (
                <>
                  <SavedControlPanel
                    tab={filters.tab}
                    tabCounts={filters.tabCounts}
                    onTabChange={filters.setTab}
                    isAuthenticated={Boolean(user)}
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
                      filters.query.trim().length > 0
                    }
                  />

                  <SavedActiveFilters
                    genres={filters.genres}
                    query={filters.query}
                    sortKey={filters.sortKey}
                    direction={filters.direction}
                    isSortPinned={filters.isSortPinned}
                    onRemoveGenre={filters.toggleGenre}
                    onClearQuery={() => filters.setQuery("")}
                    onReset={filters.resetFilters}
                  />
                </>
              ) : null}

              {renderTitles()}
            </>
          )}
        </section>
      </AppPageShell>
    </main>
  );
}

export function SavedScreen() {
  return (
    <Suspense fallback={<main className="page page--saved" />}>
      <SavedScreenContent />
    </Suspense>
  );
}
