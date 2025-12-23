"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReleaseInfo, Suggestion } from "../lib/release";
import { Header } from "./components/Header";
import { ResultCard } from "./components/ResultCard";
import { SavedList } from "./components/SavedList";
import { SearchResultsGrid } from "./components/SearchResultsGrid";
import { useSavedReleases } from "./hooks/useSavedReleases";
import { useSuggestions } from "./hooks/useSuggestions";

export default function HomePage() {
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<Suggestion | null>(null);
  const [gallery, setGallery] = useState<Suggestion[]>([]);
  const [isGalleryLoading, setIsGalleryLoading] = useState(false);
  const [addingSuggestionId, setAddingSuggestionId] = useState<number | null>(
    null
  );
  const [trending, setTrending] = useState<Suggestion[]>([]);
  const [isTrendingLoading, setIsTrendingLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleClearSelection = useCallback(() => {
    setSelectedSuggestion(null);
  }, []);

  const {
    saved,
    isReady: isStorageReady,
    addRelease,
    removeRelease,
    isReleaseSaved,
    isSuggestionSaved,
    refreshAll,
    isRefreshing,
  } = useSavedReleases();
  const [activeView, setActiveView] = useState<"home" | "saved">("home");
  const { suggestions, isFetching: isFetchingSuggestions } = useSuggestions(
    title,
    selectedSuggestion,
    handleClearSelection
  );
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const loadTrending = useCallback(async () => {
    setIsTrendingLoading(true);
    try {
      const response = await fetch("/api/trending?window=week&limit=12", {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        setTrending([]);
        return;
      }
      setTrending((payload?.results as Suggestion[]) || []);
    } catch {
      setTrending([]);
    } finally {
      setIsTrendingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeView !== "home") {
      return;
    }
    if (trending.length > 0 || isTrendingLoading) {
      return;
    }
    loadTrending();
  }, [activeView, isTrendingLoading, loadTrending, trending.length]);

  useEffect(() => {
    if (activeView !== "home") {
      setIsInputFocused(false);
      setIsSearchOpen(false);
    }
  }, [activeView]);

  const fetchRelease = useCallback(
    async (inputTitle: string, suggestion: Suggestion | null) => {
      const trimmedTitle = inputTitle.trim();
      if (!trimmedTitle) {
        setError("Введи назву серіалу або фільму.");
        setRelease(null);
        return null;
      }

      const params = new URLSearchParams();
      params.set("title", trimmedTitle);
      if (suggestion) {
        params.set("tmdbId", String(suggestion.id));
        params.set("mediaType", suggestion.mediaType);
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/next-release?${params.toString()}`);
        const payload = await response.json();

        if (!response.ok) {
          setRelease(null);
          setError(payload?.message || "Не вдалося отримати дані.");
          return null;
        }

        const info = payload as ReleaseInfo;
        setRelease(info);
        return info;
      } catch (fetchError) {
        setRelease(null);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Щось пішло не так."
        );
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleSuggestionSelect = useCallback(
    (suggestion: Suggestion) => {
      setSelectedSuggestion(suggestion);
      setTitle(suggestion.title);
      setHasSubmitted(false);
      setIsInputFocused(false);
      setIsSearchOpen(false);
      fetchRelease(suggestion.title, suggestion);
    },
    [fetchRelease]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);
    setSelectedSuggestion(null);
    setIsInputFocused(false);
    setIsSearchOpen(false);
    setRelease(null);
    await loadGallery(title);
  };

  const isCurrentSaved = isReleaseSaved(release);

  const loadGallery = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setGallery([]);
      return;
    }
    setIsGalleryLoading(true);
    try {
      const response = await fetch(
        `/api/suggest?query=${encodeURIComponent(trimmed)}&limit=9`,
        {
          cache: "no-store",
        }
      );
      const payload = await response.json();
      if (!response.ok) {
        setGallery([]);
        return;
      }
      setGallery((payload?.results as Suggestion[]) || []);
    } catch {
      setGallery([]);
    } finally {
      setIsGalleryLoading(false);
    }
  }, []);

  const handleGallerySelect = useCallback(
    async (suggestion: Suggestion) => {
      setSelectedSuggestion(suggestion);
      setHasSubmitted(false);
      setIsInputFocused(false);
      setIsSearchOpen(false);
      setTitle(suggestion.title);

      if (isSuggestionSaved(suggestion)) {
        const savedMatch = saved.find(
          (item) => item.title.toLowerCase() === suggestion.title.toLowerCase()
        );
        if (savedMatch) {
          setRelease(savedMatch);
          return;
        }
      }

      setAddingSuggestionId(suggestion.id);
      try {
        await fetchRelease(suggestion.title, suggestion);
      } finally {
        setAddingSuggestionId(null);
      }
    },
    [fetchRelease, isSuggestionSaved, saved]
  );

  const handleRefreshAllClick = async () => {
    setRefreshMessage(null);
    try {
      const result = await refreshAll();
      if (!result || result.results.length === 0) {
        setRefreshMessage("Немає шоу для оновлення.");
        return;
      }
      const failed = result.results.filter((item) => item.error);
      if (failed.length > 0) {
        setRefreshMessage(`Частину шоу не оновлено (${failed.length}).`);
      } else {
        setRefreshMessage("Список оновлено.");
      }
    } catch (err) {
      setRefreshMessage(
        err instanceof Error ? err.message : "Не вдалося оновити список."
      );
    }
  };

  const shouldShowSuggestions =
    activeView === "home" && isSearchOpen && isInputFocused && suggestions.length > 0;
  const shouldShowSelection = !shouldShowSuggestions && Boolean(release);
  const shouldShowGrid =
    activeView === "home" &&
    !shouldShowSuggestions &&
    !selectedSuggestion &&
    hasSubmitted;
  const shouldShowTrending =
    activeView === "home" &&
    !shouldShowSuggestions &&
    !selectedSuggestion &&
    !hasSubmitted &&
    title.trim() === "";

  useEffect(() => {
    if (shouldShowSuggestions) {
      document.body.classList.add("no-scroll");
      return () => {
        document.body.classList.remove("no-scroll");
      };
    }
    document.body.classList.remove("no-scroll");
    return undefined;
  }, [shouldShowSuggestions]);

  const handleSearchToggle = () => {
    setIsSearchOpen((prev) => !prev);
    setActiveView("home");
  };

  return (
    <main className="page">
      <Header
        active={activeView}
        savedCount={saved.length}
        onChange={setActiveView}
        title={title}
        isLoading={isLoading}
        isSearchOpen={isSearchOpen}
        onSearchToggle={handleSearchToggle}
        onSearchChange={(value) => {
          setTitle(value);
          setHasSubmitted(false);
        }}
        onSearchSubmit={handleSubmit}
        onSearchFocus={() => setIsInputFocused(true)}
        onSearchBlur={() => {
          blurTimeoutRef.current = setTimeout(() => {
            setIsInputFocused(false);
          }, 150);
        }}
        suggestions={suggestions}
        isFetchingSuggestions={isFetchingSuggestions}
        onSuggestionSelect={handleSuggestionSelect}
        isSuggestionSaved={isSuggestionSaved}
      />

      {activeView === "home" && (
        <>
          <section className="hero">
            <p className="eyebrow">beta</p>
            <h1>DropDate</h1>
            <p className="lead">
              Вводиш назву — отримуєш дату наступного релізу. Простий спосіб не
              прогавити нову серію.
            </p>
          </section>

          {shouldShowTrending && (
            <SearchResultsGrid
              items={trending}
              isLoading={isTrendingLoading}
              onSelect={handleGallerySelect}
              isSaved={isSuggestionSaved}
              isBusy={(suggestion) => addingSuggestionId === suggestion.id}
              title="Популярне зараз"
              emptyLabel="Не вдалося отримати тренди."
            />
          )}
        </>
      )}

      {activeView === "home" && (
        <>
          {shouldShowSelection && release && (
            <section className="result">
              <ResultCard
                release={release}
                onSave={() => addRelease(release)}
                isSaved={Boolean(isCurrentSaved)}
                disableActions={!isStorageReady}
              />
            </section>
          )}

          {shouldShowGrid && (
            <SearchResultsGrid
              items={gallery}
              isLoading={isGalleryLoading}
              onSelect={handleGallerySelect}
              isSaved={isSuggestionSaved}
              isBusy={(suggestion) => addingSuggestionId === suggestion.id}
              title="Рекомендації після пошуку"
              emptyLabel="Нічого не знайдено. Спробуй іншу назву."
            />
          )}
        </>
      )}

      {activeView === "saved" && (
        <section className="saved">
          <div className="saved-actions">
            <button
              type="button"
              className="secondary"
              onClick={handleRefreshAllClick}
              disabled={!isStorageReady || saved.length === 0 || isRefreshing}
            >
              {isRefreshing ? "Оновлюємо…" : "Оновити всі"}
            </button>
            {refreshMessage && <p className="hint">{refreshMessage}</p>}
          </div>
          {!isStorageReady ? (
            <p className="hint">Завантажуємо список…</p>
          ) : saved.length === 0 ? (
            <p className="hint">
              Поки що порожньо. Додай перший тайтл через вкладку “Пошук”.
            </p>
          ) : (
            <SavedList
              items={saved}
              onRemove={removeRelease}
              actionsDisabled={!isStorageReady}
            />
          )}
        </section>
      )}
    </main>
  );
}
