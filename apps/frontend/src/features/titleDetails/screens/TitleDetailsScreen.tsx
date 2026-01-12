"use client";

import { useRouter } from "next/navigation";
import { Header } from "../../../widgets/Header";
import { SearchOverlay } from "../../../widgets/SearchOverlay";
import { SearchResultsGrid } from "../../../widgets/SearchResultsGrid";
import { ListBadges } from "../../../shared/ui/ListBadges";
import { ListPickerModal } from "../../../widgets/ListPickerModal";
import { getReleaseStatusLabel } from "../../../../lib/release";
import { copy } from "../../../../lib/strings";
import { useTitleDetails } from "../hooks/useTitleDetails";

export function TitleDetailsScreen() {
  const router = useRouter();
  const {
    blurTimeoutRef,
    currentListTypes,
    currentRelease,
    details,
    error,
    formatDate,
    getListTypes,
    handleAddCurrent,
    handleListChange,
    handleNav,
    handleRatingChange,
    handleSearchClose,
    handleSearchSubmit,
    handleSearchToggle,
    handleSuggestionSelect,
    handleWatchCountChange,
    isFetchingSuggestions,
    isLoading,
    isSearchOpen,
    isSuggestionSaved,
    listPickerAnchor,
    localRating,
    localWatchCount,
    metaRows,
    recommendations,
    release,
    savedCount,
    setIsInputFocused,
    setListPickerAnchor,
    setLocalRating,
    setTitle,
    statusListType,
    suggestions,
    title,
    toasts,
    yearFromDate,
  } = useTitleDetails();

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
                      {yearFromDate(details.releaseDate || details.firstAirDate)}
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
                {statusListType ? (
                  <div className="details-user-card">
                    <h4>{copy.details.labels.personalTitle}</h4>
                    <div className="details-user-row">
                      <span>{copy.details.labels.yourRating}</span>
                      <div className="details-user-rating">
                        <input
                          type="range"
                          min={1}
                          max={10}
                          step={1}
                          value={localRating || 1}
                          onChange={(event) =>
                            handleRatingChange(Number(event.target.value))
                          }
                        />
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={localRating ?? ""}
                          placeholder="–"
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            if (Number.isNaN(value)) {
                              setLocalRating(undefined);
                              return;
                            }
                            handleRatingChange(
                              Math.min(10, Math.max(1, value))
                            );
                          }}
                        />
                      </div>
                    </div>
                    <div className="details-user-row">
                      <span>{copy.details.labels.watchCount}</span>
                      <div className="details-user-stepper">
                        <button
                          type="button"
                          onClick={() => handleWatchCountChange(-1)}
                          aria-label="Зменшити"
                        >
                          −
                        </button>
                        <span>{localWatchCount || 1}</span>
                        <button
                          type="button"
                          onClick={() => handleWatchCountChange(1)}
                          aria-label="Збільшити"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
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
                      {formatDate(details?.releaseDate || details?.firstAirDate)}
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
