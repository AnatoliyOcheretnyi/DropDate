"use client";

import { useCallback, useState } from "react";
import type { ReleaseInfo, Suggestion } from "../lib/release";
import { ResultCard } from "./components/ResultCard";
import { SavedList } from "./components/SavedList";
import { Suggestions } from "./components/Suggestions";
import { Tabs } from "./components/Tabs";
import { useSavedReleases } from "./hooks/useSavedReleases";
import { useSuggestions } from "./hooks/useSuggestions";

export default function HomePage() {
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const {
    saved,
    isReady: isStorageReady,
    addRelease,
    removeRelease,
    isReleaseSaved,
    isSuggestionSaved,
    initialTab,
  } = useSavedReleases();
  const [activeTab, setActiveTab] = useState<"search" | "saved">(initialTab);
  const { suggestions, isFetching: isFetchingSuggestions } = useSuggestions(
    title,
    selectedSuggestion,
    () => setSelectedSuggestion(null)
  );

  const fetchRelease = useCallback(
    async (inputTitle: string, suggestion: Suggestion | null) => {
      const trimmedTitle = inputTitle.trim();
      if (!trimmedTitle) {
        setError("Введи назву серіалу або фільму.");
        setRelease(null);
        return;
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
          return;
        }

        setRelease(payload as ReleaseInfo);
      } catch (fetchError) {
        setRelease(null);
        setError(fetchError instanceof Error ? fetchError.message : "Щось пішло не так.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleSuggestionSelect = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setTitle(suggestion.title);
    fetchRelease(suggestion.title, suggestion);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    fetchRelease(title, selectedSuggestion);
  };

  const isCurrentSaved = isReleaseSaved(release);

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">beta</p>
        <h1>DropDate</h1>
        <p className="lead">
          Вводиш назву — отримуєш дату наступного релізу. Простий спосіб не прогавити нову серію.
        </p>
      </section>

      <Tabs active={activeTab} savedCount={saved.length} onChange={setActiveTab} />

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
                  onChange={(event) => setTitle(event.target.value)}
                  autoComplete="off"
                />
                <button type="submit" disabled={isLoading}>
                  {isLoading ? "Шукаємо…" : "Знайти"}
                </button>
              </div>
            </form>

            {isFetchingSuggestions && <p className="hint">Підбираємо варіанти…</p>}
            <Suggestions
              suggestions={suggestions}
              isSaved={isSuggestionSaved}
              onSelect={handleSuggestionSelect}
            />
            {error && <p className="error">{error}</p>}
          </section>

          {release && (
            <section className="result">
              <ResultCard
                release={release}
                onSave={() => addRelease(release)}
                isSaved={Boolean(isCurrentSaved)}
                disableActions={!isStorageReady}
              />
            </section>
          )}
        </>
      )}

      {activeTab === "saved" && (
        <section className="saved">
          {!isStorageReady ? (
            <p className="hint">Завантажуємо список…</p>
          ) : saved.length === 0 ? (
            <p className="hint">Поки що порожньо. Додай перший тайтл через вкладку “Пошук”.</p>
          ) : (
            <SavedList items={saved} onRemove={removeRelease} actionsDisabled={!isStorageReady} />
          )}
        </section>
      )}
    </main>
  );
}
