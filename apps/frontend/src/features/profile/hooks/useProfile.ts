"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReleaseInfo, Suggestion } from "../../../shared/lib/release";
import { copy } from "../../../shared/lib/strings";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { useSuggestions } from "../../../shared/hooks/useSuggestions";
import { useAuth } from "../../../shared/state/auth";
import type { SavedRelease } from "../../../shared/types/releases";
import type { ProfileStat, TabDefinition, TabKey } from "../types";

type ListCopy = {
  follow: string;
  watchlist: string;
  favorite: string;
  watched: string;
  disliked: string;
  empty: string;
  loginPrompt: string;
};

type StatsCopy = {
  total: string;
  thisWeek: string;
  watched: string;
  watchHours: string;
  rewatches: string;
  series: string;
  views: string;
  avgRating: string;
};

const fallbackListCopy: ListCopy = {
  follow: "Підписка",
  watchlist: "Want to watch",
  favorite: "Favorites",
  watched: "Переглянуто",
  disliked: "Не сподобалось",
  empty: "Поки порожньо — додай зі сторінки пошуку/трендів",
  loginPrompt: "Увійди, щоб зберігати більше та мати кілька списків.",
};

const fallbackStatsCopy: StatsCopy = {
  total: "Всього у списку",
  thisWeek: "Цього тижня",
  watched: "Переглянуто",
  watchHours: "Годин у списку",
  rewatches: "Повторні перегляди",
  series: "Серіалів",
  views: "Переглядів",
  avgRating: "Середня оцінка",
};

export function useProfile() {
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
  const listCopy = copy.lists ?? fallbackListCopy;
  const statsCopy = copy.listStats ?? fallbackStatsCopy;

  const tabs = useMemo<TabDefinition[]>(
    () => {
      const countFor = (key: TabKey) =>
        saved.filter((item) => {
          const lists =
            item.listTypes && item.listTypes.length > 0
              ? item.listTypes
              : ["follow"];
          return lists.includes(key);
        }).length;
      return [
        { key: "follow", label: listCopy.follow, count: countFor("follow") },
        {
          key: "watchlist",
          label: listCopy.watchlist,
          count: countFor("watchlist"),
        },
        {
          key: "favorite",
          label: listCopy.favorite,
          count: countFor("favorite"),
        },
        {
          key: "watched",
          label: listCopy.watched,
          count: countFor("watched"),
        },
        {
          key: "disliked",
          label: listCopy.disliked,
          count: countFor("disliked"),
        },
      ];
    },
    [listCopy, saved]
  );

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
      saved.filter((item) => normalizeItemLists(item).includes(activeTab)),
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

  const middleStat = useMemo<ProfileStat>(() => {
    if (activeTab === "follow") {
      return { value: weekCount, label: statsCopy.thisWeek, tone: "amber" };
    }
    if (activeTab === "watchlist") {
      return {
        value: `${watchlistAvgRating}/10`,
        label: statsCopy.avgRating ?? "Середня оцінка",
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

  const handleNav = (view: string) => {
    if (view === "saved") {
      router.push("/saved");
      return;
    }
    router.push("/");
  };

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "DD";

  return {
    activeTab,
    authLoading,
    blurTimeoutRef,
    handleLogout,
    handleNav,
    handleRemoveFromTab,
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
    middleStat,
    savedCount,
    seriesCount,
    setActiveTab,
    setIsAuthOpen,
    setTitle,
    statsCopy,
    suggestions,
    tabItems,
    tabs,
    title,
    user,
  };
}
