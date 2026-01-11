"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Suggestion } from "../../lib/release";
import { Header } from "../components/Header";
import { SearchOverlay } from "../components/SearchOverlay";
import { SearchResultsGrid } from "../components/SearchResultsGrid";
import { copy } from "../../lib/strings";
import { useSavedReleases } from "../hooks/useSavedReleases";
import { useSuggestions } from "../hooks/useSuggestions";

type SearchPayload = {
  results: Suggestion[];
  page: number;
  totalPages: number;
  totalResults: number;
};

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [filter, setFilter] = useState<"all" | "movie" | "tv">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [, setIsInputFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { saved, isSuggestionSaved, getListTypes } = useSavedReleases();

  const handleClearSelection = useCallback(() => {
    setSelectedSuggestion(null);
    setError(null);
  }, []);

  const { suggestions, isFetching: isFetchingSuggestions } = useSuggestions(
    title,
    selectedSuggestion,
    handleClearSelection
  );

  const currentQuery = (searchParams.get("query") || "").trim();

  const loadResults = useCallback(
    async (query: string, pageToLoad: number, append: boolean) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setResults([]);
        setPage(1);
        setTotalPages(1);
        setTotalResults(0);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/search?query=${encodeURIComponent(trimmed)}&page=${pageToLoad}`,
          { cache: "no-store" }
        );
        const payload = (await response.json()) as SearchPayload;
        if (!response.ok) {
          setResults([]);
          setPage(1);
          setTotalPages(1);
          setTotalResults(0);
          setError(copy.errors.searchFailed);
          return;
        }

        setResults((prev) => (append ? [...prev, ...payload.results] : payload.results));
        setPage(payload.page || pageToLoad);
        setTotalPages(payload.totalPages || 1);
        setTotalResults(payload.totalResults || 0);
      } catch {
        setResults([]);
        setPage(1);
        setTotalPages(1);
        setTotalResults(0);
        setError(copy.errors.searchFailed);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    setTitle(currentQuery);
    setFilter("all");
    handleClearSelection();
    if (!currentQuery) {
      setResults([]);
      return;
    }
    loadResults(currentQuery, 1, false);
  }, [currentQuery, handleClearSelection, loadResults]);

  const filteredResults = useMemo(() => {
    if (filter === "all") {
      return results;
    }
    return results.filter((item) => item.mediaType === filter);
  }, [filter, results]);

  const handleSelect = useCallback(
    async (suggestion: Suggestion) => {
      setSelectedSuggestion(suggestion);
      setIsInputFocused(false);
      setIsSearchOpen(false);
      setTitle(suggestion.title);
      router.push(`/title/${suggestion.mediaType}/${suggestion.id}`);
    },
    [router]
  );

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

  const handleSearchToggle = () => {
    setIsSearchOpen((prev) => !prev);
  };

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false);
    setIsInputFocused(false);
  }, []);

  const handleNav = (view: "home" | "saved") => {
    if (view === "saved") {
      router.push("/saved");
      return;
    }
    router.push("/");
  };

  const handleLoadMore = () => {
    if (isLoading || page >= totalPages) {
      return;
    }
    loadResults(currentQuery, page + 1, true);
  };

  return (
    <main className="page">
      <Header
        active="home"
        savedCount={saved.length}
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
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<main className="page" />}>
      <SearchPageContent />
    </Suspense>
  );
}
