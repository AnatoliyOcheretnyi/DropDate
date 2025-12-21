"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReleaseInfo, Suggestion } from "../lib/release";
import { ResultCard } from "./components/ResultCard";
import { SavedList } from "./components/SavedList";
import { SearchResultsGrid } from "./components/SearchResultsGrid";
import { Suggestions } from "./components/Suggestions";
import { Tabs } from "./components/Tabs";
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
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
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
  const [activeTab, setActiveTab] = useState<"search" | "saved">("search");
  const hasAppliedInitialTab = useRef(false);
  const { suggestions, isFetching: isFetchingSuggestions } = useSuggestions(
    title,
    selectedSuggestion,
    handleClearSelection
  );
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!hasAppliedInitialTab.current && isStorageReady) {
      if (saved.length > 0) {
        setActiveTab("saved");
      }
      hasAppliedInitialTab.current = true;
    }
  }, [isStorageReady, saved.length]);

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
      fetchRelease(suggestion.title, suggestion);
    },
    [fetchRelease]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);
    setSelectedSuggestion(null);
    setIsInputFocused(false);
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

  const shouldShowSuggestions = isInputFocused && suggestions.length > 0;
  const shouldShowSelection = !shouldShowSuggestions && Boolean(release);
  const shouldShowGrid =
    !shouldShowSuggestions && !selectedSuggestion && hasSubmitted;

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">beta</p>
        <h1>DropDate</h1>
        <p className="lead">
          Вводиш назву — отримуєш дату наступного релізу. Простий спосіб не
          прогавити нову серію.
        </p>
      </section>

      <Tabs
        active={activeTab}
        savedCount={saved.length}
        onChange={setActiveTab}
      />

      {activeTab === "search" && (
        <>
          <section className="search">
            <form className="search-form" onSubmit={handleSubmit}>
              <label htmlFor="title">Назва</label>
              <div className="search-input-group">
                <input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="Наприклад, Dune"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setHasSubmitted(false);
                  }}
                  autoComplete="off"
                  onFocus={() => {
                    if (blurTimeoutRef.current) {
                      clearTimeout(blurTimeoutRef.current);
                    }
                    setIsInputFocused(true);
                  }}
                  onBlur={() => {
                    blurTimeoutRef.current = setTimeout(() => {
                      setIsInputFocused(false);
                    }, 150);
                  }}
                />
                <button type="submit" disabled={isLoading}>
                  {isLoading ? "Шукаємо…" : "Знайти"}
                </button>
              </div>
            </form>

            <div className="search-autocomplete">
              <div className="hint-slot">
                {isFetchingSuggestions && (
                  <p className="hint">Підбираємо варіанти…</p>
                )}
              </div>
              {shouldShowSuggestions && (
                <Suggestions
                  suggestions={suggestions}
                  isSaved={isSuggestionSaved}
                  onSelect={handleSuggestionSelect}
                />
              )}
            </div>
            {error && <p className="error">{error}</p>}
          </section>

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
            />
          )}
        </>
      )}

      {activeTab === "saved" && (
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
