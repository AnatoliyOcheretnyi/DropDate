"use client";

import { Suspense } from "react";
import { Header } from "../../../../app/components/Header";
import { SearchOverlay } from "../../../../app/components/SearchOverlay";
import { SearchResultsGrid } from "../../../../app/components/SearchResultsGrid";
import { copy } from "../../../../lib/strings";
import { useSearchPage } from "../hooks/useSearchPage";

export function SearchScreen() {
  const {
    blurTimeoutRef,
    currentQuery,
    error,
    filter,
    filteredResults,
    getListTypes,
    handleLoadMore,
    handleNav,
    handleSearchClose,
    handleSearchSubmit,
    handleSearchToggle,
    handleSelect,
    handleSuggestionSelect,
    isFetchingSuggestions,
    isLoading,
    isSearchOpen,
    isSuggestionSaved,
    page,
    savedCount,
    setFilter,
    setTitle,
    suggestions,
    title,
    totalPages,
    totalResults,
  } = useSearchPage();

  return (
    <Suspense fallback={<main className="page" />}>
      <main className="page">
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
          onChange={(value) => setTitle(value)}
          onSubmit={handleSearchSubmit}
          onFocus={() => undefined}
          onBlur={() => {
            blurTimeoutRef.current = setTimeout(() => {}, 150);
          }}
          suggestions={suggestions}
          isFetchingSuggestions={isFetchingSuggestions}
          onSuggestionSelect={handleSuggestionSelect}
          isSuggestionSaved={isSuggestionSaved}
        />

        <section className="search-title">
          <h2>{copy.sections.searchResultsTitle}</h2>
          {currentQuery && (
            <p className="hint">
              {totalResults > 0
                ? copy.search.resultsCount(totalResults)
                : copy.search.searchingHint}
            </p>
          )}
        </section>

        <div className="search-filters">
          <button
            type="button"
            className={`filter-chip${filter === "all" ? " active" : ""}`}
            onClick={() => setFilter("all")}
          >
            {copy.filters.all}
          </button>
          <button
            type="button"
            className={`filter-chip${filter === "movie" ? " active" : ""}`}
            onClick={() => setFilter("movie")}
          >
            {copy.filters.onlyMovies}
          </button>
          <button
            type="button"
            className={`filter-chip${filter === "tv" ? " active" : ""}`}
            onClick={() => setFilter("tv")}
          >
            {copy.filters.onlySeries}
          </button>
        </div>

        {error && <p className="hint">{error}</p>}

        <SearchResultsGrid
          items={filteredResults}
          isLoading={isLoading}
          onSelect={handleSelect}
          getListTypes={getListTypes}
          title={copy.sections.searchResults}
          emptyLabel={copy.search.emptyFull}
          showEmpty
        />

        {page < totalPages && (
          <button
            type="button"
            className="load-more"
            onClick={handleLoadMore}
            disabled={isLoading}
          >
            {isLoading ? copy.hints.loadingResults : copy.actions.loadMore}
          </button>
        )}
      </main>
    </Suspense>
  );
}
