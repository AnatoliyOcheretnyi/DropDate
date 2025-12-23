"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Suggestion } from "../lib/release";
import { Header } from "./components/Header";
import { SavedList } from "./components/SavedList";
import { TrendingCarousel } from "./components/TrendingCarousel";
import { useSavedReleases } from "./hooks/useSavedReleases";
import { useSuggestions } from "./hooks/useSuggestions";

export default function HomePage() {
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<Suggestion | null>(null);
  const [trendingMovies, setTrendingMovies] = useState<Suggestion[]>([]);
  const [trendingSeries, setTrendingSeries] = useState<Suggestion[]>([]);
  const [isTrendingLoading, setIsTrendingLoading] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const handleClearSelection = useCallback(() => {
    setSelectedSuggestion(null);
  }, []);

  const {
    saved,
    isReady: isStorageReady,
    removeRelease,
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
      const response = await fetch("/api/trending?window=week&limit=18", {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        setTrendingMovies([]);
        setTrendingSeries([]);
        return;
      }
      const movies = (payload?.movies as Suggestion[]) || [];
      const series = (payload?.series as Suggestion[]) || [];
      setTrendingMovies(movies);
      setTrendingSeries(series);
    } catch {
      setTrendingMovies([]);
      setTrendingSeries([]);
    } finally {
      setIsTrendingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeView !== "home") {
      return;
    }
    if (
      trendingMovies.length > 0 ||
      trendingSeries.length > 0 ||
      isTrendingLoading
    ) {
      return;
    }
    loadTrending();
  }, [
    activeView,
    isTrendingLoading,
    loadTrending,
    trendingMovies.length,
    trendingSeries.length,
  ]);

  useEffect(() => {
    if (activeView !== "home") {
      setIsInputFocused(false);
      setIsSearchOpen(false);
    }
  }, [activeView]);

  const handleSuggestionSelect = useCallback(
    (suggestion: Suggestion) => {
      setSelectedSuggestion(suggestion);
      setTitle(suggestion.title);
      setIsInputFocused(false);
      setIsSearchOpen(false);
      router.push(`/title/${suggestion.mediaType}/${suggestion.id}`);
    },
    [router]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    setSelectedSuggestion(null);
    setIsInputFocused(false);
    setIsSearchOpen(false);
    router.push(`/search?query=${encodeURIComponent(trimmed)}`);
  };

  const handleGallerySelect = useCallback(
    (suggestion: Suggestion) => {
      setSelectedSuggestion(suggestion);
      setIsInputFocused(false);
      setIsSearchOpen(false);
      setTitle(suggestion.title);
      router.push(`/title/${suggestion.mediaType}/${suggestion.id}`);
    },
    [router]
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
    activeView === "home" &&
    isSearchOpen &&
    isInputFocused &&
    suggestions.length > 0;
  const shouldShowTrending = activeView === "home" && !selectedSuggestion;

  const soonReleases = useMemo(() => {
    const now = new Date();
    const endSoon = new Date();
    endSoon.setDate(endSoon.getDate() + 30);
    return saved
      .filter((item) => item.status === "upcoming" && item.nextRelease)
      .filter((item) => {
        const date = new Date(item.nextRelease);
        if (Number.isNaN(date.getTime())) {
          return false;
        }
        return date >= now && date <= endSoon;
      })
      .sort(
        (a, b) =>
          new Date(a.nextRelease).getTime() - new Date(b.nextRelease).getTime()
      )
      .slice(0, 12);
  }, [saved]);
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

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false);
    setIsInputFocused(false);
  }, []);

  useEffect(() => {
    if (searchParams.get("view") === "saved") {
      setActiveView("saved");
    }
  }, [searchParams]);

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
        onSearchClose={handleSearchClose}
        onSearchChange={(value) => {
          setTitle(value);
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
          <section className="hero hero-bleed">
            <div className="hero-inner">
              <p className="eyebrow">beta</p>
              <h1>DropDate</h1>
              <p className="lead">
                Вводиш назву — отримуєш дату наступного релізу. Простий спосіб
                не прогавити нову серію.
              </p>
            </div>
          </section>

          {soonReleases.length > 0 && (
            <section className="saved-section">
              <div className="saved-section-head">
                <h3>Скоро реліз</h3>
              </div>
              <div className="saved-carousel">
                <div className="saved-track">
                  {soonReleases.map((item) => {
                    const mediaType =
                      item.mediaType ||
                      (item.type === "movie" ? "movie" : "tv");
                    const imageUrl = item.posterUrl || item.backdropUrl;
                    return (
                      <div key={item.id} className="saved-card">
                        <button
                          type="button"
                          className="saved-card-link"
                          onClick={() => {
                            if (item.tmdbId) {
                              router.push(`/title/${mediaType}/${item.tmdbId}`);
                            } else {
                              router.push(
                                `/search?query=${encodeURIComponent(
                                  item.title
                                )}`
                              );
                            }
                          }}
                        >
                          <div className="saved-card-media">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={item.title}
                                loading="lazy"
                              />
                            ) : (
                              <div className="poster-card-fallback">
                                {item.title.slice(0, 1)}
                              </div>
                            )}
                          </div>
                          <div
                            className="saved-card-overlay"
                            aria-hidden="true"
                          >
                            <span className="saved-card-status">
                              Наступний реліз
                            </span>
                            <h4>{item.title}</h4>
                            <p>
                              {new Date(item.nextRelease).toLocaleDateString(
                                "uk-UA"
                              )}
                            </p>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {shouldShowTrending && (
            <>
              <TrendingCarousel
                title="Фільми зараз в тренді"
                items={trendingMovies}
                isLoading={isTrendingLoading}
                onSelect={handleGallerySelect}
                isSaved={isSuggestionSaved}
                isBusy={() => false}
              />
              <TrendingCarousel
                title="Серіали зараз в тренді"
                items={trendingSeries}
                isLoading={isTrendingLoading}
                onSelect={handleGallerySelect}
                isSaved={isSuggestionSaved}
                isBusy={() => false}
              />
            </>
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
