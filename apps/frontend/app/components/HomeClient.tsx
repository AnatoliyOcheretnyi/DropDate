"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Suggestion } from "../../lib/release";
import { Header } from "./Header";
import { SearchOverlay } from "./SearchOverlay";
import { TrendingCarousel } from "./TrendingCarousel";
import { copy } from "../../lib/strings";
import { useSavedReleases } from "../hooks/useSavedReleases";
import { useSuggestions } from "../hooks/useSuggestions";

type Props = {
  trendingMovies: Suggestion[];
  trendingSeries: Suggestion[];
};

function HomeClientContent({ trendingMovies, trendingSeries }: Props) {
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<Suggestion | null>(null);
  const [, setIsInputFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const handleClearSelection = useCallback(() => {
    setSelectedSuggestion(null);
  }, []);

  const { saved, isSuggestionSaved, getListTypes } = useSavedReleases();
  const { suggestions, isFetching: isFetchingSuggestions } = useSuggestions(
    title,
    selectedSuggestion,
    handleClearSelection
  );

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

  const shouldShowTrending = !selectedSuggestion;

  useEffect(() => {
    if (searchParams.get("view") === "saved") {
      router.push("/saved");
    }
  }, [searchParams, router]);

  const handleSearchToggle = () => {
    setIsSearchOpen((prev) => !prev);
  };

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false);
    setIsInputFocused(false);
  }, []);

  return (
    <main className="page">
      <Header
        active="home"
        savedCount={saved.length}
        onChange={(view) => {
          router.push(view === "saved" ? "/saved" : "/");
        }}
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
        onSubmit={handleSubmit}
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

      <>
        <section className="hero hero-bleed">
          <div className="hero-inner">
            <p className="eyebrow">{copy.hero.eyebrow}</p>
            <h1>{copy.appName}</h1>
            <p className="lead">{copy.hero.webLead}</p>
          </div>
        </section>

        {shouldShowTrending && (
          <>
            <TrendingCarousel
              title={copy.sections.trendingMovies}
              items={trendingMovies}
              isLoading={false}
              onSelect={handleGallerySelect}
              getListTypes={getListTypes}
            />
            <TrendingCarousel
              title={copy.sections.trendingSeries}
              items={trendingSeries}
              isLoading={false}
              onSelect={handleGallerySelect}
              getListTypes={getListTypes}
            />
          </>
        )}
      </>
    </main>
  );
}

export function HomeClient(props: Props) {
  return (
    <Suspense fallback={<main className="page" />}>
      <HomeClientContent {...props} />
    </Suspense>
  );
}
