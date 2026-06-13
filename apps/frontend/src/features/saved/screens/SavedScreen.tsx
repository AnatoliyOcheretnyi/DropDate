"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "../../../widgets/Header";
import { SearchOverlay } from "../../../widgets/SearchOverlay";
import { AuthorizedSavedList } from "../components/AuthorizedSavedList";
import { ProfileTabs } from "../../profile/components/ProfileTabs";
import { ProfileStats } from "../../profile/components/ProfileStats";
import { copy } from "../../../shared/lib/strings";
import { useSavedPage } from "../hooks/useSavedPage";
import { useAuth } from "../../../shared/state/auth";
import type { SavedRelease } from "../../../shared/types/releases";
import type { ProfileStat, TabDefinition, TabKey } from "../../profile/types";

const normalizeItemLists = (item: SavedRelease): TabKey[] => {
  if (item.listTypes && item.listTypes.length > 0) {
    return item.listTypes;
  }
  return ["follow"];
};

export function SavedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("follow");
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
    setTitle,
    suggestions,
    title,
  } = useSavedPage();

  const tabCounts = useMemo(
    () =>
      saved.reduce<Record<TabKey, number>>(
        (counts, item) => {
          normalizeItemLists(item).forEach((listType) => {
            counts[listType] += 1;
          });
          return counts;
        },
        {
          follow: 0,
          watchlist: 0,
          favorite: 0,
          watched: 0,
          disliked: 0,
        }
      ),
    [saved]
  );
  const tabs: TabDefinition[] = [
    { key: "follow", label: copy.lists.follow, count: tabCounts.follow },
    {
      key: "watchlist",
      label: copy.lists.watchlist,
      count: tabCounts.watchlist,
    },
    {
      key: "favorite",
      label: copy.lists.favorite,
      count: tabCounts.favorite,
    },
    { key: "watched", label: copy.lists.watched, count: tabCounts.watched },
    {
      key: "disliked",
      label: copy.lists.disliked,
      count: tabCounts.disliked,
    },
  ];
  const statsCopy = useMemo(
    () =>
      copy.listStats ?? {
        total: "Всього у списку",
        thisWeek: "Цього тижня",
        rewatches: "Повторні перегляди",
        series: "Серіалів",
        views: "Переглядів",
        avgRating: "Середня оцінка",
      },
    []
  );

  const tabItems = useMemo(
    () =>
      saved.filter((item) =>
        normalizeItemLists(item).includes(activeTab)
      ),
    [activeTab, saved]
  );

  const weekCount = useMemo(() => {
    if (activeTab !== "follow") {
      return 0;
    }
    const now = new Date();
    const start = new Date(now);
    const day = start.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return tabItems.filter((item) => {
      if (!item.nextRelease) {
        return false;
      }
      const parsed = new Date(item.nextRelease);
      if (Number.isNaN(parsed.getTime())) {
        return false;
      }
      return parsed >= start && parsed < end;
    }).length;
  }, [activeTab, tabItems]);

  const seriesCount = useMemo(
    () =>
      tabItems.filter(
        (item) => item.mediaType === "tv" || item.type === "series"
      ).length,
    [tabItems]
  );

  const watchlistAvgRating = useMemo(() => {
    if (activeTab !== "watchlist") {
      return 0;
    }
    const ratings = tabItems
      .map((item) => item.tmdbRating)
      .filter((value): value is number => typeof value === "number");
    if (ratings.length === 0) {
      return 0;
    }
    const total = ratings.reduce((sum, value) => sum + value, 0);
    return Math.round((total / ratings.length) * 10) / 10;
  }, [activeTab, tabItems]);

  const rewatchCount = useMemo(() => {
    if (activeTab !== "favorite") {
      return 0;
    }
    return tabItems.reduce((sum, item) => {
      const count = item.watchCount || 0;
      return sum + Math.max(0, count - 1);
    }, 0);
  }, [activeTab, tabItems]);

  const watchedViews = useMemo(() => {
    if (activeTab !== "watched") {
      return 0;
    }
    return tabItems.reduce((sum, item) => sum + (item.watchCount || 0), 0);
  }, [activeTab, tabItems]);

  const averageRating = useMemo(() => {
    if (activeTab !== "disliked") {
      return 0;
    }
    const ratings = tabItems
      .map((item) => item.userRating)
      .filter((value): value is number => typeof value === "number");
    if (ratings.length === 0) {
      return 0;
    }
    const total = ratings.reduce((sum, value) => sum + value, 0);
    return Math.round((total / ratings.length) * 10) / 10;
  }, [activeTab, tabItems]);

  const middleStat = useMemo<ProfileStat>(() => {
    if (activeTab === "follow") {
      return { value: weekCount, label: statsCopy.thisWeek, tone: "amber" };
    }
    if (activeTab === "watchlist") {
      return {
        value: `${watchlistAvgRating}/10`,
        label: statsCopy.avgRating,
        tone: "amber",
      };
    }
    if (activeTab === "favorite") {
      return { value: rewatchCount, label: statsCopy.rewatches, tone: "amber" };
    }
    if (activeTab === "watched") {
      return { value: watchedViews, label: statsCopy.views, tone: "amber" };
    }
    return { value: averageRating, label: statsCopy.avgRating, tone: "amber" };
  }, [
    activeTab,
    averageRating,
    rewatchCount,
    statsCopy,
    watchlistAvgRating,
    watchedViews,
    weekCount,
  ]);

  return (
    <main className="page page--saved">
      <Header
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
      />
      <SearchOverlay
        title={title}
        isLoading={false}
        isOpen={isSearchOpen}
        onClose={handleSearchClose}
        onChange={(value) => setTitle(value)}
        onSubmit={handleSubmit}
        onFocus={() => undefined}
        onBlur={() => {
          blurTimeoutRef.current = setTimeout(() => {
            // noop
          }, 150);
        }}
        suggestions={suggestions}
        isFetchingSuggestions={isFetchingSuggestions}
        onSuggestionSelect={handleSuggestionSelect}
        isSuggestionSaved={isSuggestionSaved}
      />

      <section className="saved">
        <div className="saved-hero">
          <div className="saved-hero-copy">
            <p className="eyebrow">Персональна бібліотека</p>
            <h1>Мій список</h1>
            <p>
              Усе, що ти відстежуєш, плануєш подивитися або вже оцінив.
            </p>
          </div>
          <div className="saved-hero-side">
            <div className="saved-total">
              <strong>{savedCount}</strong>
              <span>тайтлів у бібліотеці</span>
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

        <div className="saved-dashboard">
          <ProfileTabs
            tabs={tabs}
            activeTab={activeTab}
            isAuthenticated={Boolean(user)}
            onChange={setActiveTab}
          />
          <ProfileStats
            total={tabItems.length}
            middleStat={middleStat}
            seriesCount={seriesCount}
            statsCopy={{ total: statsCopy.total, series: statsCopy.series }}
          />
        </div>

        {!isStorageReady ? (
          <div className="saved-empty">
            <p>{copy.hints.loadingList}</p>
          </div>
        ) : tabItems.length === 0 ? (
          <div className="saved-empty">
            <span aria-hidden="true">＋</span>
            <h2>Тут поки порожньо</h2>
            <p>{copy.hints.listEmpty}</p>
            <button type="button" onClick={() => router.push("/")}>
              Знайти тайтли
            </button>
          </div>
        ) : (
          <AuthorizedSavedList
            items={tabItems}
            onRemove={(item) => removeRelease(item.id)}
            actionsDisabled={!isStorageReady}
            groupByDate={activeTab === "follow"}
          />
        )}
      </section>
    </main>
  );
}
