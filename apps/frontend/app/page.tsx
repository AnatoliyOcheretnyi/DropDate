"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getReleaseStatusLabel, type ReleaseInfo, type Suggestion } from "../lib/release";

export default function HomePage() {
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

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

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">beta</p>
        <h1>DropDate</h1>
        <p className="lead">
          Вводиш назву — отримуєш дату наступного релізу. Простий спосіб не прогавити нову серію.
        </p>
      </section>

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
                  <p className="suggestion-meta">
                    {suggestion.mediaType === "movie" ? "Фільм" : "Серіал"}
                    {suggestion.year ? ` · ${suggestion.year}` : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="error">{error}</p>}
      </section>

      {release && (
        <section className="result">
          <article className="card">
            <p className="card-label">{getReleaseStatusLabel(release.status, release.type)}</p>
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
                {(() => {
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
                })()}
              </div>
            </div>
          </article>
        </section>
      )}
    </main>
  );
}
