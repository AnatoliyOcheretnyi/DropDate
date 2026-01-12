"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReleaseInfo, Suggestion } from "../../lib/release";
import { Header } from "../components/Header";
import { SearchOverlay } from "../components/SearchOverlay";
import { AuthModal } from "../components/AuthModal";
import { SavedList } from "../components/SavedList";
import { copy } from "../../lib/strings";
import { useSavedReleases } from "../hooks/useSavedReleases";
import { useSuggestions } from "../hooks/useSuggestions";
import { useAuth } from "../state/auth";
import type { SavedRelease } from "../lib/releases";

type TabKey = "follow" | "watchlist" | "favorite" | "watched" | "disliked";

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, isLoading: authLoading } = useAuth();
  const {
    saved,
    savedCount,
    isSuggestionSaved,
    removeRelease,
    setSuggestionLists,
  } = useSavedReleases();
  const [title, setTitle] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<Suggestion | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("follow");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const listCopy = copy.lists ?? {
    follow: "Підписка",
    watchlist: "Want to watch",
    favorite: "Favorites",
    watched: "Переглянуто",
    disliked: "Не сподобалось",
    empty: "Поки порожньо — додай зі сторінки пошуку/трендів",
    loginPrompt: "Увійди, щоб зберігати більше та мати кілька списків.",
  };
  const statsCopy = copy.listStats ?? {
    total: "Всього у списку",
    thisWeek: "Цього тижня",
    watched: "Переглянуто",
    watchHours: "Годин у списку",
    rewatches: "Повторні перегляди",
    series: "Серіалів",
    views: "Переглядів",
    avgRating: "Середня оцінка",
  };
  const tabs = [
    { key: "follow", label: listCopy.follow },
    { key: "watchlist", label: listCopy.watchlist },
    { key: "favorite", label: listCopy.favorite },
    { key: "watched", label: listCopy.watched },
    { key: "disliked", label: listCopy.disliked },
  ] satisfies { key: TabKey; label: string }[];

  const normalizeItemLists = useCallback((item: SavedRelease): TabKey[] => {
    if (item.listTypes && item.listTypes.length > 0) {
      return item.listTypes;
    }
    return ["follow"];
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedSuggestion(null);
  }, []);

  const { suggestions, isFetching: isFetchingSuggestions } = useSuggestions(
    title,
    selectedSuggestion,
    handleClearSelection
  );

  const handleSearchToggle = () => {
    setIsSearchOpen((prev) => !prev);
  };

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    setSelectedSuggestion(null);
    setIsSearchOpen(false);
    router.push(`/search?query=${encodeURIComponent(trimmed)}`);
  };

  const handleSuggestionSelect = useCallback(
    (suggestion: Suggestion) => {
      setSelectedSuggestion(suggestion);
      setTitle(suggestion.title);
      setIsSearchOpen(false);
      router.push(`/title/${suggestion.mediaType}/${suggestion.id}`);
    },
    [router]
  );

  const tabItems = useMemo(
    () =>
      saved.filter((item) =>
        normalizeItemLists(item).includes(activeTab)
      ),
    [activeTab, normalizeItemLists, saved]
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

  const middleStat = useMemo(() => {
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

  const handleRemoveFromTab = useCallback(
    (item: SavedRelease) => {
      const currentLists = normalizeItemLists(item);
      const nextLists = currentLists.filter((entry) => entry !== activeTab);
      if (!item.tmdbId || !item.mediaType) {
        removeRelease(item.id);
        return;
      }
      const suggestion: Suggestion = {
        id: item.tmdbId,
        title: item.title,
        mediaType: item.mediaType,
        posterUrl: item.posterUrl,
      };
      const release: ReleaseInfo = {
        title: item.title,
        type: item.type,
        nextRelease: item.nextRelease,
        source: item.source,
        posterUrl: item.posterUrl,
        backdropUrl: item.backdropUrl,
        status: item.status,
      };
      if (nextLists.length === 0) {
        removeRelease(item.id);
        return;
      }
      setSuggestionLists(suggestion, nextLists, release);
    },
    [activeTab, normalizeItemLists, removeRelease, setSuggestionLists]
  );

  useEffect(() => {
    if (!user) {
      setActiveTab("follow");
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "DD";

  return (
    <main className="page page--profile">
      <Header
        active="home"
        savedCount={savedCount}
        onChange={(view) => {
          if (view === "saved") {
            router.push("/saved");
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
          blurTimeoutRef.current = setTimeout(() => {}, 150);
        }}
        suggestions={suggestions}
        isFetchingSuggestions={isFetchingSuggestions}
        onSuggestionSelect={handleSuggestionSelect}
        isSuggestionSaved={isSuggestionSaved}
      />

      <section className="profile-shell">
        <div className="profile-card">
          <div className="profile-id">
            <div className="profile-avatar">{initials}</div>
            <div>
              <p className="profile-title">{copy.auth.profile}</p>
              <p className="profile-subtitle">
                {user?.email || listCopy.loginPrompt}
              </p>
            </div>
          </div>
          <div className="profile-actions">
            {user ? (
              <button type="button" className="secondary danger" onClick={handleLogout}>
                {copy.auth.signOut}
              </button>
            ) : (
              <button
                type="button"
                className="secondary"
                onClick={() => setIsAuthOpen(true)}
                disabled={authLoading}
              >
                {copy.auth.signIn}
              </button>
            )}
          </div>
        </div>
        <div className="profile-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`profile-tab${activeTab === tab.key ? " active" : ""}`}
              aria-label={tab.label}
              onClick={() => setActiveTab(tab.key)}
              disabled={!user && tab.key !== "follow"}
            >
              <span className={`tab-icon tab-icon--${tab.key}`} aria-hidden="true">
                {tab.key === "follow" && (
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M12 3a6 6 0 0 1 6 6v3.1l1.6 2.7a1 1 0 0 1-.86 1.5H5.26a1 1 0 0 1-.86-1.5l1.6-2.7V9a6 6 0 0 1 6-6Zm0 18a2.5 2.5 0 0 1-2.45-2h4.9A2.5 2.5 0 0 1 12 21Z"
                      fill="currentColor"
                    />
                  </svg>
                )}
                {tab.key === "watchlist" && (
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M6 3h12a2 2 0 0 1 2 2v16l-8-4-8 4V5a2 2 0 0 1 2-2Z"
                      fill="currentColor"
                    />
                  </svg>
                )}
                {tab.key === "favorite" && (
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M12 20.6 4.6 13.3a4.5 4.5 0 0 1 6.4-6.4L12 7.9l1-1a4.5 4.5 0 1 1 6.4 6.4L12 20.6Z"
                      fill="currentColor"
                    />
                  </svg>
                )}
                {tab.key === "watched" && (
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm4.2-12.6-5.2 5.2-2.4-2.4-1.4 1.4 3.8 3.8 6.6-6.6-1.4-1.4Z"
                      fill="currentColor"
                    />
                  </svg>
                )}
                {tab.key === "disliked" && (
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M3 10h4v10H3V10Zm6.2 0h6.1c.9 0 1.7.4 2.2 1.1l2.2 3.3c.3.5.5 1 .5 1.6V20a2 2 0 0 1-2 2h-5c-.8 0-1.5-.4-1.9-1l-2.1-3.1v-7.9Z"
                      fill="currentColor"
                    />
                  </svg>
                )}
              </span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {tabItems.length === 0 ? (
          <div className="profile-empty">
            <p>{listCopy.empty}</p>
          </div>
        ) : null}
        <div className="profile-stats">
          <div className="profile-stat-card tone-green">
            <strong>{tabItems.length}</strong>
            <span>{statsCopy.total}</span>
          </div>
          <div className={`profile-stat-card tone-${middleStat.tone}`}>
            <strong>{middleStat.value}</strong>
            <span>{middleStat.label}</span>
          </div>
          <div className="profile-stat-card tone-blue">
            <strong>{seriesCount}</strong>
            <span>{statsCopy.series}</span>
          </div>
        </div>
        <SavedList
          items={tabItems}
          onRemove={handleRemoveFromTab}
          groupByDate={activeTab === "follow"}
        />
      </section>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </main>
  );
}
