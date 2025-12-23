"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Details, ReleaseInfo, Suggestion } from "../../../../lib/release";
import { Header } from "../../../components/Header";
import { getReleaseStatusLabel } from "../../../../lib/release";
import { SearchResultsGrid } from "../../../components/SearchResultsGrid";
import { useSavedReleases } from "../../../hooks/useSavedReleases";
import { useSuggestions } from "../../../hooks/useSuggestions";

type DetailsPayload = {
  details: Details;
  release?: ReleaseInfo;
  recommendations?: Suggestion[];
};

const formatDate = (value?: string) => {
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
};

export default function TitleDetailsPage() {
  const params = useParams<{ mediaType: string; id: string }>();
  const router = useRouter();
  const mediaType = params?.mediaType || "";
  const id = Number(params?.id || 0);

  const [title, setTitle] = useState("");
  const [details, setDetails] = useState<Details | null>(null);
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [recommendations, setRecommendations] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { saved, addRelease, isReleaseSaved, isSuggestionSaved } = useSavedReleases();

  const handleClearSelection = useCallback(() => {
    setError(null);
  }, []);

  const { suggestions, isFetching: isFetchingSuggestions } = useSuggestions(
    title,
    null,
    handleClearSelection
  );

  const loadDetails = useCallback(async () => {
    if (!id || (mediaType !== "movie" && mediaType !== "tv")) {
      setError("Невірний запит.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/details?tmdbId=${id}&mediaType=${mediaType}`,
        { cache: "no-store" }
      );
      const payload = (await response.json()) as DetailsPayload;
      if (!response.ok) {
        setError("Не вдалося завантажити деталі.");
        return;
      }
      setDetails(payload.details);
      setRelease(payload.release || null);
      setRecommendations(payload.recommendations || []);
    } catch {
      setError("Не вдалося завантажити деталі.");
    } finally {
      setIsLoading(false);
    }
  }, [id, mediaType]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const handleSearchToggle = () => {
    setIsSearchOpen((prev) => !prev);
  };

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false);
    setIsInputFocused(false);
  }, []);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    setIsSearchOpen(false);
    setIsInputFocused(false);
    router.push(`/search?query=${encodeURIComponent(trimmed)}`);
  };

  const handleSuggestionSelect = useCallback(
    (suggestion: Suggestion) => {
      setIsSearchOpen(false);
      setIsInputFocused(false);
      router.push(`/title/${suggestion.mediaType}/${suggestion.id}`);
    },
    [router]
  );

  const handleNav = (view: "home" | "saved") => {
    if (view === "saved") {
      router.push("/?view=saved");
      return;
    }
    router.push("/");
  };

  const metaRows = useMemo(() => {
    if (!details) {
      return [];
    }
    return [
      { label: "Тип", value: details.mediaType === "movie" ? "Фільм" : "Серіал" },
      { label: "Статус", value: details.status || "—" },
      {
        label: "Реліз",
        value: details.releaseDate ? formatDate(details.releaseDate) : formatDate(details.firstAirDate),
      },
      { label: "Тривалість", value: details.runtime ? `${details.runtime} хв` : "—" },
      {
        label: "Сезони / епізоди",
        value:
          details.seasonCount || details.episodeCount
            ? `${details.seasonCount || 0} / ${details.episodeCount || 0}`
            : "—",
      },
      { label: "Рейтинг", value: details.voteAverage ? details.voteAverage.toFixed(1) : "—" },
      { label: "Голосів", value: details.voteCount ? details.voteCount.toString() : "—" },
      { label: "Популярність", value: details.popularity ? details.popularity.toFixed(1) : "—" },
    ];
  }, [details]);

  return (
    <main className="page">
      <Header
        active="home"
        savedCount={saved.length}
        onChange={handleNav}
        title={title}
        isLoading={isLoading}
        isSearchOpen={isSearchOpen}
        onSearchToggle={handleSearchToggle}
        onSearchClose={handleSearchClose}
        onSearchChange={(value) => {
          setTitle(value);
        }}
        onSearchSubmit={handleSearchSubmit}
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

      <section className="details-hero details-bleed">
        {details?.backdropUrl && (
          <div className="details-backdrop">
            <img src={details.backdropUrl} alt="" aria-hidden="true" />
          </div>
        )}
        <div className="details-inner">
          <div className="details-content">
            <div className="details-poster">
              {details?.posterUrl ? (
                <img src={details.posterUrl} alt={details.title} />
              ) : (
                <div className="poster-card-fallback">{details?.title?.slice(0, 1) || "?"}</div>
              )}
            </div>
            <div className="details-main">
              <p className="eyebrow">{details?.mediaType === "movie" ? "movie" : "series"}</p>
              <h1>{details?.title || "Завантаження..."}</h1>
              {details?.tagline && <p className="details-tagline">{details.tagline}</p>}
              <p className="details-overview">{details?.overview || "Опис поки відсутній."}</p>
              <div className="details-actions">
                {release && details ? (
                  <button
                    type="button"
                    className="primary"
                    onClick={() =>
                      addRelease(release, {
                        tmdbId: details.id,
                        mediaType: details.mediaType,
                      })
                    }
                    disabled={Boolean(isReleaseSaved(release))}
                  >
                    {isReleaseSaved(release) ? "У списку" : "Додати у список"}
                  </button>
                ) : (
                  <span className="hint">Немає даних про реліз</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && <p className="hint">{error}</p>}

      {details && (
        <>
          <section className="details-meta">
            <div className="details-grid">
              {metaRows.map((row) => (
                <div key={row.label} className="detail-row">
                  <span className="detail-label">{row.label}</span>
                  <span className="detail-value">{row.value}</span>
                </div>
              ))}
              {details.nextAirDate && (
                <div className="detail-row">
                  <span className="detail-label">Наступна серія</span>
                  <span className="detail-value">
                    {formatDate(details.nextAirDate)}
                    {details.nextEpisodeName ? ` · ${details.nextEpisodeName}` : ""}
                  </span>
                </div>
              )}
              {details.lastAirDate && (
                <div className="detail-row">
                  <span className="detail-label">Остання серія</span>
                  <span className="detail-value">
                    {formatDate(details.lastAirDate)}
                    {details.lastEpisodeName ? ` · ${details.lastEpisodeName}` : ""}
                  </span>
                </div>
              )}
            </div>
            {details.genres && details.genres.length > 0 && (
              <div className="details-tags">
                {details.genres.map((genre) => (
                  <span key={genre} className="detail-chip">
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </section>

          {release && (
            <section className="details-release">
              <h2>Наступний реліз</h2>
              <div className="details-release-card">
                <div className="details-release-info">
                  <span className="details-release-label">
                    {getReleaseStatusLabel(release.status, release.type)}
                  </span>
                  <h3>{release.title}</h3>
                  <p className="details-release-date">
                    {formatDate(release.nextRelease)}
                  </p>
                  <p className="details-release-source">джерело: {release.source}</p>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => addRelease(release)}
                    disabled={Boolean(isReleaseSaved(release))}
                  >
                    {isReleaseSaved(release) ? "У списку" : "Додати у список"}
                  </button>
                </div>
                {release.backdropUrl || release.posterUrl ? (
                  <div className="details-release-media">
                    <img
                      src={release.backdropUrl || release.posterUrl}
                      alt={release.title}
                    />
                  </div>
                ) : null}
              </div>
            </section>
          )}
        </>
      )}

      {recommendations.length > 0 && (
        <section className="details-recs">
          <SearchResultsGrid
            items={recommendations}
            isLoading={isLoading}
            onSelect={(item) => router.push(`/title/${item.mediaType}/${item.id}`)}
            isSaved={isSuggestionSaved}
            isBusy={() => false}
            title="Схожі тайтли"
          />
        </section>
      )}
    </main>
  );
}
