"use client";

import { useRouter } from "next/navigation";
import { Header } from "../../../widgets/Header";
import { SearchOverlay } from "../../../widgets/SearchOverlay";
import { SearchResultsGrid } from "../../../widgets/SearchResultsGrid";
import { ListBadges } from "../../../shared/ui/ListBadges";
import { ListPickerModal } from "../../../widgets/ListPickerModal";
import { getReleaseStatusLabel } from "../../../shared/lib/release";
import { copy } from "../../../shared/lib/strings";
import { CoverImage } from "../../../shared/ui/CoverImage";
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

  const mediaLabel =
    details?.mediaType === "movie"
      ? copy.mediaType.movie
      : copy.mediaType.series;
  const releaseStatus = currentRelease
    ? getReleaseStatusLabel(currentRelease.status, currentRelease.type)
    : null;

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
        onChange={setTitle}
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
          <section className="details-hero details-hero--skeleton">
            <div className="details-inner">
              <div className="details-layout">
                <div className="details-main">
                  <div className="skeleton-line skeleton-line--tiny skeleton-block" />
                  <div className="skeleton-line skeleton-line--title skeleton-block" />
                  <div className="skeleton-line skeleton-line--subtitle skeleton-block" />
                  <div className="skeleton-line skeleton-block" />
                  <div className="skeleton-line skeleton-block" />
                  <div className="skeleton-line skeleton-line--short skeleton-block" />
                  <div className="skeleton-button skeleton-block" />
                </div>
                <div className="details-release-panel skeleton-block" />
              </div>
            </div>
          </section>
          <section className="details-body details-section">
            <div className="details-info-card skeleton-block" />
            <div className="details-info-card skeleton-block" />
          </section>
        </>
      ) : details ? (
        <>
          <section className="details-hero">
            {details.backdropUrl ? (
              <div className="details-backdrop">
                <CoverImage
                  src={details.backdropUrl}
                  alt=""
                  sizes="100vw"
                  priority
                  ariaHidden
                />
              </div>
            ) : (
              <div className="details-backdrop details-backdrop--empty" />
            )}
            <div className="details-hero-shade" />

            <div className="details-inner">
              <button
                type="button"
                className="details-back"
                onClick={() => router.back()}
              >
                <span aria-hidden="true">←</span>
                Назад
              </button>

              <div className="details-layout">
                <div className="details-main">
                  <div className="details-kicker">
                    <span>{mediaLabel}</span>
                    {details.releaseDate || details.firstAirDate ? (
                      <span>
                        {yearFromDate(
                          details.releaseDate || details.firstAirDate
                        )}
                      </span>
                    ) : null}
                    {currentListTypes.length > 0 ? (
                      <div className="details-status-badges">
                        <ListBadges listTypes={currentListTypes} />
                      </div>
                    ) : null}
                  </div>

                  <h1>{details.title}</h1>

                  <div className="details-facts">
                    {details.runtime ? (
                      <span>
                        {details.runtime} {copy.details.facts.minutesSuffix}
                      </span>
                    ) : null}
                    {details.seasonCount ? (
                      <span>
                        {details.seasonCount}{" "}
                        {copy.details.facts.seasonsSuffix}
                      </span>
                    ) : null}
                    {details.episodeCount ? (
                      <span>
                        {details.episodeCount}{" "}
                        {copy.details.facts.episodesSuffix}
                      </span>
                    ) : null}
                    {details.networks?.length ? (
                      <span>{details.networks.join(", ")}</span>
                    ) : null}
                  </div>

                  {details.tagline ? (
                    <p className="details-tagline">{details.tagline}</p>
                  ) : null}
                  <p className="details-overview">
                    {details.overview || copy.hints.noOverview}
                  </p>

                  {details.genres?.length ? (
                    <div className="details-tags">
                      {details.genres.map((genre) => (
                        <span key={genre} className="detail-chip">
                          {genre}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="details-actions">
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
                    {details.homepage ? (
                      <a
                        className="details-site-link"
                        href={details.homepage}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Офіційний сайт
                      </a>
                    ) : null}
                  </div>
                </div>

                <aside className="details-release-panel">
                  <span className="details-release-kicker">
                    {releaseStatus || copy.details.labels.release}
                  </span>
                  <strong className="details-release-date">
                    {formatDate(
                      currentRelease?.nextRelease ||
                        details.nextAirDate ||
                        details.releaseDate ||
                        details.firstAirDate
                    )}
                  </strong>
                  {details.nextEpisodeName ? (
                    <span className="details-release-episode">
                      {details.nextEpisodeSeason &&
                      details.nextEpisodeNumber
                        ? `S${details.nextEpisodeSeason}E${details.nextEpisodeNumber} · `
                        : ""}
                      {details.nextEpisodeName}
                    </span>
                  ) : null}

                  <div className="details-rating-row">
                    <div>
                      <span>{copy.details.labels.tmdbRating}</span>
                      <strong>
                        {details.voteAverage
                          ? details.voteAverage.toFixed(1)
                          : copy.misc.dash}
                      </strong>
                    </div>
                    <div>
                      <span>{copy.details.labels.votes}</span>
                      <strong>
                        {details.voteCount
                          ? details.voteCount.toLocaleString("uk-UA")
                          : copy.misc.dash}
                      </strong>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </section>

          <section className="details-body details-section">
            <article className="details-info-card">
              <div className="details-section-head">
                <p className="eyebrow">Про тайтл</p>
                <h2>Основна інформація</h2>
              </div>
              <div className="details-grid">
                {metaRows.map((row) => (
                  <div key={row.label} className="detail-row">
                    <span className="detail-label">{row.label}</span>
                    <span className="detail-value">{row.value}</span>
                  </div>
                ))}
                {details.nextAirDate ? (
                  <div className="detail-row detail-row--wide">
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
                ) : null}
                {details.originCountry?.length ? (
                  <div className="detail-row">
                    <span className="detail-label">
                      {copy.details.labels.country}
                    </span>
                    <span className="detail-value">
                      {details.originCountry.join(", ")}
                    </span>
                  </div>
                ) : null}
              </div>
            </article>

            <aside className="details-info-card details-personal-card">
              <div className="details-section-head">
                <p className="eyebrow">Моя бібліотека</p>
                <h2>
                  {statusListType
                    ? copy.details.labels.personalTitle
                    : "Додай до списку"}
                </h2>
              </div>

              {statusListType ? (
                <div className="details-user-controls">
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
              ) : (
                <>
                  <p className="details-personal-copy">
                    Збережи тайтл, щоб стежити за релізом і вести власний
                    прогрес.
                  </p>
                  <div className="list-picker">
                    <button
                      type="button"
                      className="list-picker__button"
                      onClick={() => handleAddCurrent("release")}
                    >
                      {copy.actions.addToList}
                    </button>
                    <ListPickerModal
                      isOpen={listPickerAnchor === "release"}
                      selected={currentListTypes}
                      onClose={() => setListPickerAnchor(null)}
                      onChange={handleListChange}
                    />
                  </div>
                </>
              )}
            </aside>
          </section>
        </>
      ) : null}

      {error ? <p className="hint details-error">{error}</p> : null}

      {recommendations.length > 0 ? (
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
      ) : null}

      {toasts.length > 0 ? (
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
      ) : null}
    </main>
  );
}
