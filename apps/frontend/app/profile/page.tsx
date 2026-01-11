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

type TabKey = "follow" | "watchlist" | "favorite";

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
    empty: "Поки порожньо — додай зі сторінки пошуку/трендів",
    loginPrompt: "Увійди, щоб зберігати більше та мати кілька списків.",
  };
  const tabs = [
    { key: "follow", label: listCopy.follow },
    { key: "watchlist", label: listCopy.watchlist },
    { key: "favorite", label: listCopy.favorite },
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
