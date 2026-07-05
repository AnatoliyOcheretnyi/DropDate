"use client";

import { Suspense, useMemo, useState } from "react";
import { AppPageShell } from "../../../widgets/AppPageShell";
import { SearchResultsGrid } from "../../../widgets/SearchResultsGrid";
import { copy } from "../../../shared/lib/strings";
import { useSearchPage } from "../hooks/useSearchPage";

export function SearchScreen() {
  const [sort, setSort] = useState<"relevance" | "year" | "title">(
    "relevance"
  );
  const {
    allResults,
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
  const sortedResults = useMemo(() => {
    if (sort === "relevance") {
      return filteredResults;
    }
    return [...filteredResults].sort((first, second) => {
      if (sort === "title") {
        return first.title.localeCompare(second.title, "uk");
      }
      return Number(second.year || 0) - Number(first.year || 0);
    });
  }, [filteredResults, sort]);
  const movieCount = allResults.filter(
    (item) => item.mediaType === "movie"
  ).length;
  const seriesCount = allResults.filter(
    (item) => item.mediaType === "tv"
  ).length;

  return (
    <Suspense fallback={<main className="page" />}>
      <main className="page page--search">
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
            onFocus: () => undefined,
            onBlur: () => {
              blurTimeoutRef.current = setTimeout(() => {}, 150);
            },
            suggestions,
            isFetchingSuggestions,
            onSuggestionSelect: handleSuggestionSelect,
            isSuggestionSaved,
          }}
        >

        <section className="search-hero">
          <div className="search-hero-copy">
            <p className="eyebrow">Пошук у каталозі</p>
            <h1>
              {currentQuery ? (
                <>
                  Результати для <span>«{currentQuery}»</span>
                </>
              ) : (
                "Знайди наступний тайтл"
              )}
            </h1>
            <p>
              Фільми й серіали в одному місці. Відкрий тайтл, перевір дату
              релізу та додай його до свого списку.
            </p>
          </div>
          <form className="search-page-form" onSubmit={handleSearchSubmit}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0-2a9 9 0 1 0 5.66 15.99l4.68 4.68 1.41-1.41-4.68-4.68A9 9 0 0 0 11 2Z"
                fill="currentColor"
              />
            </svg>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Назва фільму або серіалу"
              aria-label="Назва фільму або серіалу"
            />
            <button type="submit" disabled={!title.trim() || isLoading}>
              Знайти
            </button>
          </form>
        </section>

        <div className="search-toolbar">
          <div className="search-filters" aria-label="Тип контенту">
            <button
              type="button"
              className={`filter-chip${filter === "all" ? " active" : ""}`}
              onClick={() => setFilter("all")}
            >
              <span>{copy.filters.all}</span>
              <strong>{allResults.length}</strong>
            </button>
            <button
              type="button"
              className={`filter-chip${filter === "movie" ? " active" : ""}`}
              onClick={() => setFilter("movie")}
            >
              <span>{copy.filters.onlyMovies}</span>
              <strong>{movieCount}</strong>
            </button>
            <button
              type="button"
              className={`filter-chip${filter === "tv" ? " active" : ""}`}
              onClick={() => setFilter("tv")}
            >
              <span>{copy.filters.onlySeries}</span>
              <strong>{seriesCount}</strong>
            </button>
          </div>
          <label className="search-sort">
            <span>Сортування</span>
            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as typeof sort)
              }
            >
              <option value="relevance">За релевантністю</option>
              <option value="year">Спочатку нові</option>
              <option value="title">За назвою</option>
            </select>
          </label>
        </div>

        {error ? <div className="search-state search-state--error">{error}</div> : null}

        <SearchResultsGrid
          items={sortedResults}
          isLoading={isLoading}
          onSelect={handleSelect}
          getListTypes={getListTypes}
          title={copy.sections.searchResults}
          emptyLabel={
            currentQuery
              ? "Нічого не знайшли. Перевір назву або зміни тип контенту."
              : "Введи назву фільму або серіалу, щоб почати пошук."
          }
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
        </AppPageShell>
      </main>
    </Suspense>
  );
}
