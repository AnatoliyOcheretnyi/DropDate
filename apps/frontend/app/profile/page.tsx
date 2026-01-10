"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReleaseInfo, Suggestion } from "../../lib/release";
import { Header } from "../components/Header";
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

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "DD";

  return (
    <main className="page">
      <Header
        active="home"
        savedCount={savedCount}
        onChange={(view) => {
          if (view === "home") {
            router.push("/");
          } else {
            router.push("/");
          }
        }}
        title={title}
        isLoading={false}
        isSearchOpen={isSearchOpen}
        onSearchToggle={handleSearchToggle}
        onSearchClose={handleSearchClose}
        onSearchChange={(value) => setTitle(value)}
        onSearchSubmit={handleSubmit}
        onSearchFocus={() => undefined}
        onSearchBlur={() => {
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
            <button type="button" className="secondary danger" onClick={logout}>
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
              onClick={() => setActiveTab(tab.key)}
              disabled={!user && tab.key !== "follow"}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {tabItems.length === 0 ? (
          <div className="profile-empty">
            <p>{listCopy.empty}</p>
          </div>
        ) : (
          <SavedList items={tabItems} onRemove={handleRemoveFromTab} />
        )}
      </section>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </main>
  );
}
