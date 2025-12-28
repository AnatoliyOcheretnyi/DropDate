"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Details, ReleaseInfo, Suggestion } from "../../../../lib/release";
import { Header } from "../../../components/Header";
import { getReleaseStatusLabel } from "../../../../lib/release";
import { SearchResultsGrid } from "../../../components/SearchResultsGrid";
import { copy } from "../../../../lib/strings";
import { useSavedReleases } from "../../../hooks/useSavedReleases";
import { useSuggestions } from "../../../hooks/useSuggestions";

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
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { saved, addRelease, isReleaseSaved, isSuggestionSaved } =
    useSavedReleases();

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
      {
        label: copy.details.labels.type,
        value:
          details.mediaType === "movie"
            ? copy.mediaType.movie
            : copy.mediaType.series,
      },
      { label: copy.details.labels.status, value: details.status || copy.misc.dash },
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
        value: details.voteAverage ? details.voteAverage.toFixed(1) : copy.misc.dash,
      },
      {
        label: copy.details.labels.votes,
        value: details.voteCount ? details.voteCount.toString() : copy.misc.dash,
      },
      {
        label: copy.details.labels.popularity,
        value: details.popularity ? details.popularity.toFixed(1) : copy.misc.dash,
      },
    ];
  }, [details]);

  return (
    <main className="page page--details">
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

      {isLoading && !details ? (
        <section className="details-hero details-bleed">
          <div className="details-backdrop skeleton-block" />
          <div className="details-inner">
            <div className="details-content">
              <div className="details-poster">
                <div className="details-poster-skeleton skeleton-block" />
              </div>
              <div className="details-main">
                <div className="skeleton-line skeleton-line--tiny" />
                <div className="skeleton-line skeleton-line--title" />
                <div className="skeleton-line skeleton-line--subtitle" />
                <div className="skeleton-line" />
                <div className="skeleton-line" />
                <div className="skeleton-line skeleton-line--short" />
                <div className="skeleton-button skeleton-block" />
              </div>
              <div className="details-side">
                <div className="skeleton-line skeleton-line--title" />
                <div className="skeleton-line" />
                <div className="skeleton-line skeleton-line--short" />
                <div className="skeleton-line" />
                <div className="skeleton-line skeleton-line--short" />
              </div>
            </div>
          </div>
        </section>
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
                      {isReleaseSaved(release)
                        ? copy.actions.inList
                        : copy.actions.addToList}
                    </button>
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
                      {copy.details.labels.status}: {details?.status || copy.misc.dash}
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
                        {copy.details.labels.country}: {details.originCountry.join(", ")}
                      </li>
                    ) : null}
                    {details?.genres && details.genres.length > 0 ? (
                      <li>
                        {copy.details.labels.genres}: {details.genres.join(", ")}
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
                  <span className="detail-label">{copy.details.labels.nextEpisode}</span>
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
                  <span className="detail-label">{copy.details.labels.lastEpisode}</span>
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
                  <button
                    type="button"
                    className="primary"
                    onClick={() => addRelease(release)}
                    disabled={Boolean(isReleaseSaved(release))}
                  >
                    {isReleaseSaved(release)
                      ? copy.actions.inList
                      : copy.actions.addToList}
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
        <section className="details-recs details-section">
          <SearchResultsGrid
            items={recommendations}
            isLoading={isLoading}
            onSelect={(item) =>
              router.push(`/title/${item.mediaType}/${item.id}`)
            }
            isSaved={isSuggestionSaved}
            isBusy={() => false}
            title={copy.sections.similarTitles}
          />
        </section>
      )}
    </main>
  );
}
