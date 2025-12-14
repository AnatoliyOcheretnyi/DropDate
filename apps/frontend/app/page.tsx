"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getReleaseStatusLabel, type ReleaseInfo, type Suggestion } from "../lib/release";

const STORAGE_KEY = "dropdate:saved-releases";

type SavedRelease = ReleaseInfo & { id: string };

const normalizeTitle = (value: string) => value.trim().toLowerCase();
const releaseIdentifier = (title: string, type: ReleaseInfo["type"]) =>
  `${normalizeTitle(title)}::${type}`;
const getReleaseId = (release: ReleaseInfo) => releaseIdentifier(release.title, release.type);
const getSuggestionId = (suggestion: Suggestion) =>
  releaseIdentifier(suggestion.title, suggestion.mediaType === "movie" ? "movie" : "series");

export default function HomePage() {
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "saved">("search");
  const [savedReleases, setSavedReleases] = useState<SavedRelease[]>([]);
  const controllerRef = useRef<AbortController | null>(null);
  const hasHydratedStorage = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedRelease[];
        setSavedReleases(parsed);
      }
    } catch {
      // ignore broken storage
    } finally {
      hasHydratedStorage.current = true;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedStorage.current) {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedReleases));
    } catch {
      // ignore write errors
    }
  }, [savedReleases]);

  useEffect(() => {
    const trimmed = title.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      setSelectedSuggestion(null);
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      return;
    }

    if (selectedSuggestion && selectedSuggestion.title.toLowerCase() !== trimmed.toLowerCase()) {
      setSelectedSuggestion(null);
    }

    setIsFetchingSuggestions(true);
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const controller = new AbortController();
    controllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/suggest?query=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal
        });
        const payload = await response.json();
        if (response.ok) {
          setSuggestions((payload?.results as Suggestion[]) || []);
        } else {
          setSuggestions([]);
        }
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [selectedSuggestion, title]);

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
        setSuggestions([]);
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

  const isCurrentSaved =
    release && savedReleases.some((item) => item.id === getReleaseId(release));

  const handleSaveCurrent = () => {
    if (!release || isCurrentSaved) {
      return;
    }
    const entry: SavedRelease = {
      ...release,
      id: getReleaseId(release)
    };
    setSavedReleases((prev) => [...prev, entry]);
  };

  const handleRemoveSaved = (id: string) => {
    setSavedReleases((prev) => prev.filter((item) => item.id !== id));
  };

  const suggestionIsSaved = (suggestion: Suggestion) => {
    const id = getSuggestionId(suggestion);
    return savedReleases.some((item) => item.id === id);
  };

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">beta</p>
        <h1>DropDate</h1>
        <p className="lead">
          Вводиш назву — отримуєш дату наступного релізу. Простий спосіб не прогавити нову серію.
        </p>
      </section>

      <nav className="tabs">
        <button
          type="button"
          className={activeTab === "search" ? "active" : ""}
          onClick={() => setActiveTab("search")}
        >
          Пошук
        </button>
        <button
          type="button"
          className={activeTab === "saved" ? "active" : ""}
          onClick={() => setActiveTab("saved")}
        >
          Мій список ({savedReleases.length})
        </button>
      </nav>

      {activeTab === "search" && (
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
        {suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map((suggestion) => (
              <li key={`${suggestion.mediaType}-${suggestion.id}`}>
                <button type="button" onClick={() => handleSuggestionSelect(suggestion)}>
                  <p className="suggestion-title">{suggestion.title}</p>
                  <div className="suggestion-meta-row">
                    <p className="suggestion-meta">
                      {suggestion.mediaType === "movie" ? "Фільм" : "Серіал"}
                      {suggestion.year ? ` · ${suggestion.year}` : ""}
                    </p>
                    {suggestionIsSaved(suggestion) && <span className="saved-pill">У списку</span>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="error">{error}</p>}
      </section>
      )}

      {activeTab === "search" && release && (
        <section className="result">
          <article className="card">
            <div className="card-head">
              <p className="card-label">{getReleaseStatusLabel(release.status, release.type)}</p>
              <button
                type="button"
                className="secondary"
                onClick={handleSaveCurrent}
                disabled={Boolean(isCurrentSaved)}
              >
                {isCurrentSaved ? "У списку" : "Додати у список"}
              </button>
            </div>
            <div className="card-body">
              <div className={`poster${release.posterUrl ? "" : " placeholder"}`}>
                {release.posterUrl ? (
                  <img src={release.posterUrl} alt={release.title} loading="lazy" />
                ) : (
                  <span>{release.title.slice(0, 1)}</span>
                )}
              </div>
              <div className="card-details">
                <h2>{release.title}</h2>
                <ReleaseDetails release={release} />
              </div>
            </div>
          </article>
        </section>
      )}

      {activeTab === "saved" && (
        <section className="saved">
          {savedReleases.length === 0 ? (
            <p className="hint">Поки що порожньо. Додай перший тайтл через вкладку “Пошук”.</p>
          ) : (
            <ul className="saved-list">
              {savedReleases.map((item) => (
                <li key={item.id}>
                  <article className="card compact">
                    <div className="card-head">
                      <p className="card-label">{getReleaseStatusLabel(item.status, item.type)}</p>
                      <button
                        type="button"
                        className="secondary danger"
                        onClick={() => handleRemoveSaved(item.id)}
                      >
                        Прибрати
                      </button>
                    </div>
                    <div className="card-body">
                      <div className={`poster${item.posterUrl ? "" : " placeholder"}`}>
                        {item.posterUrl ? (
                          <img src={item.posterUrl} alt={item.title} loading="lazy" />
                        ) : (
                          <span>{item.title.slice(0, 1)}</span>
                        )}
                      </div>
                      <div className="card-details">
                        <h2>{item.title}</h2>
                        <ReleaseDetails release={item} />
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}

function ReleaseDetails({ release }: { release: ReleaseInfo }) {
  const releaseDate = new Date(release.nextRelease);
  const formattedDate = releaseDate.toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const formattedWeekday = releaseDate.toLocaleDateString("uk-UA", {
    weekday: "long"
  });

  return (
    <dl>
      <div>
        <dt>Тип</dt>
        <dd>{release.type}</dd>
      </div>
      <div>
        <dt>Дата</dt>
        <dd className="date">
          <span>{formattedDate}</span>
          <span>{formattedWeekday}</span>
        </dd>
      </div>
      <div>
        <dt>Джерело</dt>
        <dd>{release.source}</dd>
      </div>
    </dl>
  );
}
