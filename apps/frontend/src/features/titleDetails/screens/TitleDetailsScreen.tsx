"use client";

import { useRouter } from "next/navigation";
import { AppPageShell } from "../../../widgets/AppPageShell";
import { SearchResultsGrid } from "../../../widgets/SearchResultsGrid";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { ToastStack } from "../../../shared/ui/ToastStack";
import { getReleaseStatusLabel } from "../../../shared/lib/release";
import { copy } from "../../../shared/lib/strings";
import { TitleDetailsHero } from "../components/TitleDetailsHero";
import { TitleDetailsInfoPanels } from "../components/TitleDetailsInfoPanels";
import { CastSlider } from "../components/CastSlider";
import { Reveal } from "../components/Reveal";
import { useTitleDetails } from "../hooks/useTitleDetails";
import { WatchProvidersPanel } from "../components/WatchProvidersPanel";
import { RecommendToFriend } from "../components/RecommendToFriend";
import { EpisodeTracker } from "../components/EpisodeTracker";
import { AddToSharedList } from "../components/AddToSharedList";

export function TitleDetailsScreen() {
  const router = useRouter();
  const {
    blurTimeoutRef,
    currentListTypes,
    currentRelease,
    details,
    dismissToast,
    error,
    formatDate,
    getListTypes,
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
    localRating,
    localWatchCount,
    metaRows,
    recommendations,
    savedCount,
    setIsInputFocused,
    setTitle,
    statusListType,
    suggestions,
    title,
    toasts,
    yearFromDate,
  } = useTitleDetails();

  const releaseStatus = currentRelease
    ? getReleaseStatusLabel(currentRelease.status, currentRelease.type)
    : null;

  return (
    <main className="page page--details">
      {details ? (
        <div
          className={`details-page-backdrop${
            details.backdropUrl ? "" : " details-page-backdrop--empty"
          }`}
          aria-hidden="true"
        >
          {details.backdropUrl ? (
            <CoverImage
              src={details.backdropUrl}
              alt=""
              sizes="100vw"
              priority
              ariaHidden
            />
          ) : null}
        </div>
      ) : null}
      <AppPageShell
        active="home"
        savedCount={savedCount}
        onChange={handleNav}
        isSearchOpen={isSearchOpen}
        onSearchToggle={handleSearchToggle}
        onSearchClose={handleSearchClose}
        searchOverlay={{
          title,
          isLoading,
          isOpen: isSearchOpen,
          onClose: handleSearchClose,
          onChange: setTitle,
          onSubmit: handleSearchSubmit,
          onFocus: () => setIsInputFocused(true),
          onBlur: () => {
            blurTimeoutRef.current = setTimeout(() => {
              setIsInputFocused(false);
            }, 150);
          },
          suggestions,
          isFetchingSuggestions,
          onSuggestionSelect: handleSuggestionSelect,
          isSuggestionSaved,
        }}
      >
        <div className="details-page-layer">
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
              <section className="details-cast details-section">
                <div className="cast-slider">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="cast-card cast-card--skeleton">
                      <div className="cast-card-photo skeleton-block" />
                      <div className="skeleton-line skeleton-line--short skeleton-block" />
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : details ? (
            <>
              <TitleDetailsHero
                details={details}
                currentListTypes={currentListTypes}
                currentRelease={currentRelease}
                releaseStatus={releaseStatus}
                onBack={() => router.back()}
                onListChange={handleListChange}
                formatDate={formatDate}
                yearFromDate={yearFromDate}
              />
              <Reveal>
                <TitleDetailsInfoPanels
                  details={details}
                  metaRows={metaRows}
                  currentListTypes={currentListTypes}
                  statusListType={statusListType}
                  localRating={localRating}
                  localWatchCount={localWatchCount}
                  onListChange={handleListChange}
                  onRatingChange={handleRatingChange}
                  onWatchCountChange={handleWatchCountChange}
                  formatDate={formatDate}
                />
              </Reveal>
              <Reveal><WatchProvidersPanel providers={details.watchProviders} /></Reveal>
              <Reveal><RecommendToFriend details={details} /></Reveal>
              <AddToSharedList details={details} />
              <Reveal><EpisodeTracker details={details} /></Reveal>
              {details.cast && details.cast.length > 0 ? (
                <Reveal>
                  <CastSlider cast={details.cast} />
                </Reveal>
              ) : null}
            </>
          ) : null}

          {error ? <p className="hint details-error">{error}</p> : null}

          {recommendations.length > 0 ? (
            <Reveal>
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
            </Reveal>
          ) : null}
        </div>

        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </AppPageShell>
    </main>
  );
}
