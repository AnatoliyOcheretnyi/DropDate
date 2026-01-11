"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Details, ReleaseInfo, Suggestion } from "../../../../lib/release";
import { Header } from "../../../components/Header";
import { SearchOverlay } from "../../../components/SearchOverlay";
import { getReleaseStatusLabel } from "../../../../lib/release";
import { SearchResultsGrid } from "../../../components/SearchResultsGrid";
import { ListBadges } from "../../../components/ListBadges";
import { ListPickerModal } from "../../../components/ListPickerModal";
import { copy } from "../../../../lib/strings";
import { useSavedReleases } from "../../../hooks/useSavedReleases";
import { useSuggestions } from "../../../hooks/useSuggestions";
import type { ListType } from "../../../lib/releases";

type DetailsPayload = {
  details: Details;
  release?: ReleaseInfo;
  recommendations?: Suggestion[];
};

const formatDate = (value?: string) => {
  if (!value) {
    return copy.misc.dash;
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

const yearFromDate = (value?: string) => {
  if (!value || value.length < 4) {
    return "";
  }
  return value.slice(0, 4);
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
  const [, setIsInputFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { savedCount, getListTypes, setSuggestionLists, isSuggestionSaved } =
    useSavedReleases();
  const [listPickerAnchor, setListPickerAnchor] = useState<
    "main" | "release" | null
  >(null);
  const [toasts, setToasts] = useState<
    { id: string; message: string; tone?: "success" | "warning" }[]
  >([]);

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
      setError(copy.errors.invalidRequest);
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
        setError(copy.errors.detailsLoad);
        return;
      }
      setDetails(payload.details);
      setRelease(payload.release || null);
      setRecommendations(payload.recommendations || []);
    } catch {
      setError(copy.errors.detailsLoad);
    } finally {
      setIsLoading(false);
    }
  }, [id, mediaType]);

  const buildFallbackRelease = useCallback(
    (payload: Details, media: Suggestion["mediaType"]): ReleaseInfo | null => {
      const dateSource =
        payload.nextAirDate ||
        payload.releaseDate ||
        payload.lastAirDate ||
        payload.firstAirDate;
      if (!dateSource) {
        return null;
      }
      const parsed = new Date(dateSource);
      const isValid = !Number.isNaN(parsed.getTime());
      const dateValue = isValid ? parsed.toISOString() : dateSource;
      const isFuture = isValid ? parsed.getTime() > Date.now() : false;
      const status =
        media === "movie"
          ? isFuture
            ? "upcoming"
            : "released"
          : payload.status?.toLowerCase().includes("ended")
          ? "ended"
          : payload.status?.toLowerCase().includes("canceled")
          ? "ended"
          : payload.nextAirDate && isFuture
          ? "upcoming"
          : payload.lastAirDate
          ? "ended"
          : "upcoming";

      return {
        title: payload.title,
        type: media === "movie" ? "movie" : "series",
        nextRelease: dateValue,
        source: "tmdb",
        posterUrl: payload.posterUrl,
        backdropUrl: payload.backdropUrl,
        status,
      };
    },
    []
  );

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
      router.push("/saved");
      return;
    }
    router.push("/");
  };

  const currentSuggestion = useMemo(() => {
    if (!details) {
      return null;
    }
    return {
      id: details.id,
      title: details.title,
      mediaType: details.mediaType,
      year: yearFromDate(details.releaseDate || details.firstAirDate),
      posterUrl: details.posterUrl,
    } satisfies Suggestion;
  }, [details]);

  const currentListTypes = currentSuggestion
    ? getListTypes(currentSuggestion)
    : [];

  const currentRelease = useMemo(() => {
    if (!details) {
      return null;
    }
    return release || buildFallbackRelease(details, details.mediaType);
  }, [buildFallbackRelease, details, release]);

  const listLabelMap = useMemo<Record<ListType, string>>(
    () => ({
      follow: copy.lists?.follow ?? "Підписка",
      watchlist: copy.lists?.watchlist ?? "Want to watch",
      favorite: copy.lists?.favorite ?? "Favorites",
    }),
    []
  );

  const pushToast = useCallback(
    (message: string, tone: "success" | "warning" = "success") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, message, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 2600);
    },
    []
  );

  const handleListChange = useCallback(
    (next: ListType[]) => {
      if (!currentSuggestion || !currentRelease) {
        return;
      }
      const prev = currentListTypes;
      const added = next.filter((entry) => !prev.includes(entry));
      const removed = prev.filter((entry) => !next.includes(entry));

      setSuggestionLists(currentSuggestion, next, currentRelease);

      added.forEach((type) => {
        pushToast(`Додано до списку "${listLabelMap[type]}"`, "success");
      });
      removed.forEach((type) => {
        pushToast(`Видалено зі списку "${listLabelMap[type]}"`, "warning");
      });
    },
    [
      currentListTypes,
      currentRelease,
      currentSuggestion,
      listLabelMap,
      pushToast,
      setSuggestionLists,
    ]
  );

  const handleAddCurrent = useCallback(
    (anchor: "main" | "release") => {
      if (!details || !currentSuggestion || !currentRelease) {
        return;
      }
      setListPickerAnchor(anchor);
    },
    [currentRelease, currentSuggestion, details]
  );

  const metaRows = useMemo(() => {
    if (!details) {
      return [];
    }
    return [
      {
        label: copy.details.labels.type,
        value:
          details.mediaType === "movie"
            ? copy.mediaType.movie
            : copy.mediaType.series,
      },
      {
        label: copy.details.labels.status,
        value: details.status || copy.misc.dash,
      },
      {
        label: copy.details.labels.release,
        value: details.releaseDate
          ? formatDate(details.releaseDate)
          : formatDate(details.firstAirDate),
      },
      {
        label: copy.details.labels.runtime,
        value: details.runtime
          ? `${details.runtime} ${copy.details.facts.minutesSuffix}`
          : copy.misc.dash,
      },
      {
        label: copy.details.labels.seasonsEpisodes,
        value:
          details.seasonCount || details.episodeCount
            ? `${details.seasonCount || 0} / ${details.episodeCount || 0}`
            : copy.misc.dash,
      },
      {
        label: copy.details.labels.rating,
        value: details.voteAverage
          ? details.voteAverage.toFixed(1)
          : copy.misc.dash,
      },
      {
        label: copy.details.labels.votes,
        value: details.voteCount
          ? details.voteCount.toString()
          : copy.misc.dash,
      },
      {
        label: copy.details.labels.popularity,
        value: details.popularity
          ? details.popularity.toFixed(1)
          : copy.misc.dash,
      },
    ];
  }, [details]);

  return (
    <main className="page page--details">
      <Header
        active="home"
        savedCount={savedCount}
        onChange={handleNav}
        isSearchOpen={isSearchOpen}
        onSearchToggle={handleSearchToggle}
        onSearchClose={handleSearchClose}
      />
      <SearchOverlay
        title={title}
        isLoading={isLoading}
        isOpen={isSearchOpen}
        onClose={handleSearchClose}
        onChange={(value) => {
          setTitle(value);
        }}
        onSubmit={handleSearchSubmit}
        onFocus={() => setIsInputFocused(true)}
        onBlur={() => {
          blurTimeoutRef.current = setTimeout(() => {
            setIsInputFocused(false);
          }, 150);
        }}
        suggestions={suggestions}
        isFetchingSuggestions={isFetchingSuggestions}
        onSuggestionSelect={handleSuggestionSelect}
        isSuggestionSaved={isSuggestionSaved}
      />

      {isLoading && !details ? (
        <>
          <section className="details-hero details-bleed details-hero--skeleton">
            <div className="details-inner">
              <div className="details-content">
                <div className="details-poster">
                  <div className="details-poster-skeleton skeleton-block" />
                </div>
                <div className="details-main">
                  <div className="skeleton-line skeleton-line--tiny skeleton-block" />
                  <div className="skeleton-line skeleton-line--title skeleton-block" />
                  <div className="skeleton-line skeleton-line--subtitle skeleton-block" />
                  <div className="skeleton-line skeleton-block" />
                  <div className="skeleton-line skeleton-block" />
                  <div className="skeleton-line skeleton-line--short skeleton-block" />
                  <div className="skeleton-button skeleton-block" />
                </div>
                <div className="details-side">
                  <div className="details-side-card">
                    <div className="skeleton-line skeleton-line--title skeleton-block" />
                    <div className="skeleton-line skeleton-block" />
                    <div className="skeleton-line skeleton-line--short skeleton-block" />
                    <div className="skeleton-line skeleton-block" />
                    <div className="skeleton-line skeleton-line--short skeleton-block" />
                  </div>
                  <div className="details-side-card">
                    <div className="skeleton-line skeleton-line--short skeleton-block" />
                    <div className="skeleton-line skeleton-block" />
                    <div className="skeleton-line skeleton-line--short skeleton-block" />
                    <div className="skeleton-line skeleton-block" />
                    <div className="skeleton-line skeleton-line--short skeleton-block" />
                  </div>
                </div>
              </div>
            </div>
          </section>
          <section className="details-meta details-section">
            <div className="details-grid details-grid--skeleton">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="detail-row">
                  <div className="skeleton-line skeleton-line--short skeleton-block" />
                  <div className="skeleton-line skeleton-block" />
                </div>
              ))}
            </div>
            <div className="details-tags">
              {Array.from({ length: 4 }).map((_, index) => (
                <span key={index} className="detail-chip skeleton-block" />
              ))}
            </div>
          </section>
          <section className="details-release details-section">
            <div className="skeleton-line skeleton-line--title skeleton-block" />
            <div className="details-release-card">
              <div className="details-release-info">
                <div className="skeleton-line skeleton-line--tiny skeleton-block" />
                <div className="skeleton-line skeleton-line--subtitle skeleton-block" />
                <div className="skeleton-line skeleton-block" />
                <div className="skeleton-line skeleton-line--short skeleton-block" />
                <div className="skeleton-button skeleton-block" />
              </div>
              <div className="details-release-media details-release-media--skeleton skeleton-block" />
            </div>
          </section>
          <section className="details-recs details-section">
            <div className="skeleton-line skeleton-line--title skeleton-block" />
            <div className="skeleton-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="skeleton-card skeleton-block" />
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="details-hero details-bleed">
          {details?.backdropUrl ? (
            <div className="details-backdrop">
              <img src={details.backdropUrl} alt="" aria-hidden="true" />
            </div>
          ) : (
            <div className="details-backdrop details-backdrop--empty" />
          )}
          <div className="details-inner">
            <div className="details-content">
              <div className="details-poster">
                <ListBadges listTypes={currentListTypes} />
                {details?.posterUrl ? (
                  <img src={details.posterUrl} alt={details.title} />
                ) : (
                  <div className="poster-card-fallback">
                    {details?.title?.slice(0, 1) || "?"}
                  </div>
                )}
              </div>
              <div className="details-main">
                <p className="eyebrow">
                  {details?.mediaType === "movie"
                    ? copy.details.facts.movie
                    : copy.details.facts.series}
                </p>
                <h1>{details?.title || copy.hints.loadingTitle}</h1>
                <div className="details-facts">
                  {details?.releaseDate || details?.firstAirDate ? (
                    <span>
                      {yearFromDate(
                        details.releaseDate || details.firstAirDate
                      )}
                    </span>
                  ) : null}
                  {details?.runtime ? (
                    <span>
                      {details.runtime} {copy.details.facts.minutesSuffix}
                    </span>
                  ) : null}
                  {details?.seasonCount ? (
                    <span>
                      {details.seasonCount} {copy.details.facts.seasonsSuffix}
                    </span>
                  ) : null}
                  {details?.episodeCount ? (
                    <span>
                      {details.episodeCount} {copy.details.facts.episodesSuffix}
                    </span>
                  ) : null}
                  {details?.networks && details.networks.length > 0 ? (
                    <span>{details.networks.join(", ")}</span>
                  ) : null}
                </div>
                {details?.tagline && (
                  <p className="details-tagline">{details.tagline}</p>
                )}
                <p className="details-overview">
                  {details?.overview || copy.hints.noOverview}
                </p>
                <div className="details-actions">
                  {details ? (
                    <div className="list-picker">
                      <button
                        type="button"
                        className={`list-picker__button${
                          currentListTypes.length > 0 ? " is-active" : ""
                        }`}
                        onClick={() => handleAddCurrent("main")}
                      >
                        {currentListTypes.length > 0 ? (
                          <>
                            <span className="list-picker__check">✓</span>
                            <span>
                              У {currentListTypes.length}{" "}
                              {currentListTypes.length === 1
                                ? "списку"
                                : "списках"}
                            </span>
                          </>
                        ) : (
                          copy.actions.addToList
                        )}
                      </button>
                      <ListPickerModal
                        isOpen={listPickerAnchor === "main"}
                        selected={currentListTypes}
                        onClose={() => setListPickerAnchor(null)}
                        onChange={handleListChange}
                      />
                    </div>
                  ) : (
                    <span className="hint">{copy.hints.noReleaseData}</span>
                  )}
                </div>
              </div>
              <aside className="details-side">
                <div className="details-side-card">
                  <div className="details-stat">
                    <span>{copy.details.labels.tmdbRating}</span>
                    <strong>
                      {details?.voteAverage
                        ? details.voteAverage.toFixed(1)
                        : copy.misc.dash}
                    </strong>
                  </div>
                  <div className="details-stat">
                    <span>{copy.details.labels.votes}</span>
                    <strong>
                      {details?.voteCount
                        ? details.voteCount.toLocaleString("uk-UA")
                        : copy.misc.dash}
                    </strong>
                  </div>
                  <div className="details-stat">
                    <span>{copy.details.labels.popularity}</span>
                    <strong>
                      {details?.popularity
                        ? details.popularity.toFixed(1)
                        : copy.misc.dash}
                    </strong>
                  </div>
                </div>
                <div className="details-side-card">
                  <h4>{copy.details.labels.detailsTitle}</h4>
                  <ul>
                    <li>
                      {copy.details.labels.status}:{" "}
                      {details?.status || copy.misc.dash}
                    </li>
                    <li>
                      {copy.details.labels.release}:{" "}
                      {formatDate(
                        details?.releaseDate || details?.firstAirDate
                      )}
                    </li>
                    {details?.originCountry &&
                    details.originCountry.length > 0 ? (
                      <li>
                        {copy.details.labels.country}:{" "}
                        {details.originCountry.join(", ")}
                      </li>
                    ) : null}
                    {details?.genres && details.genres.length > 0 ? (
                      <li>
                        {copy.details.labels.genres}:{" "}
                        {details.genres.join(", ")}
                      </li>
                    ) : null}
                    {details?.homepage ? (
                      <li>
                        {copy.details.labels.site}:{" "}
                        <a
                          href={details.homepage}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {copy.details.labels.siteLink}
                        </a>
                      </li>
                    ) : null}
                  </ul>
                </div>
              </aside>
            </div>
          </div>
        </section>
      )}

      {error && <p className="hint">{error}</p>}

      {details && (
        <>
          <section className="details-meta details-section">
            <div className="details-grid">
              {metaRows.map((row) => (
                <div key={row.label} className="detail-row">
                  <span className="detail-label">{row.label}</span>
                  <span className="detail-value">{row.value}</span>
                </div>
              ))}
              {details.nextAirDate && (
                <div className="detail-row">
                  <span className="detail-label">
                    {copy.details.labels.nextEpisode}
                  </span>
                  <span className="detail-value">
                    {formatDate(details.nextAirDate)}
                    {details.nextEpisodeName
                      ? ` · ${details.nextEpisodeName}`
                      : ""}
                  </span>
                </div>
              )}
              {details.lastAirDate && (
                <div className="detail-row">
                  <span className="detail-label">
                    {copy.details.labels.lastEpisode}
                  </span>
                  <span className="detail-value">
                    {formatDate(details.lastAirDate)}
                    {details.lastEpisodeName
                      ? ` · ${details.lastEpisodeName}`
                      : ""}
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
            <section className="details-release details-section">
              <h2>{copy.sections.nextRelease}</h2>
              <div className="details-release-card">
                <div className="details-release-info">
                  <span className="details-release-label">
                    {getReleaseStatusLabel(release.status, release.type)}
                  </span>
                  <h3>{release.title}</h3>
                  <p className="details-release-date">
                    {formatDate(release.nextRelease)}
                  </p>
                  <p className="details-release-source">
                    {copy.details.labels.source}: {release.source}
                  </p>
                  <div className="list-picker">
                    <button
                      type="button"
                      className={`list-picker__button${
                        currentListTypes.length > 0 ? " is-active" : ""
                      }`}
                      onClick={() => handleAddCurrent("release")}
                    >
                      {currentListTypes.length > 0 ? (
                        <>
                          <span className="list-picker__check">✓</span>
                          <span>
                            У {currentListTypes.length}{" "}
                            {currentListTypes.length === 1
                              ? "списку"
                              : "списках"}
                          </span>
                        </>
                      ) : (
                        copy.actions.addToList
                      )}
                    </button>
                    <ListPickerModal
                      isOpen={listPickerAnchor === "release"}
                      selected={currentListTypes}
                      onClose={() => setListPickerAnchor(null)}
                      onChange={handleListChange}
                    />
                  </div>
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
        <section className="details-recs details-section">
          <SearchResultsGrid
            items={recommendations}
            isLoading={isLoading}
            onSelect={(item) =>
              router.push(`/title/${item.mediaType}/${item.id}`)
            }
            getListTypes={getListTypes}
            title={copy.sections.similarTitles}
          />
        </section>
      )}
      {toasts.length > 0 && (
        <div className="toast-stack" role="status" aria-live="polite">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast${toast.tone ? ` toast--${toast.tone}` : ""}`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
