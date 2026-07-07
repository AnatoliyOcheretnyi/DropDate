"use client";

import { useRouter } from "next/navigation";
import { AppPageShell } from "../../../widgets/AppPageShell";
import { Reveal } from "../../titleDetails/components/Reveal";
import { usePersonDetails } from "../hooks/usePersonDetails";
import { PersonHero } from "../components/PersonHero";
import { PersonRecommendation } from "../components/PersonRecommendation";
import { PersonSavedStrip } from "../components/PersonSavedStrip";
import { PersonFilmographySection } from "../components/PersonFilmographySection";

export function PersonScreen() {
  const router = useRouter();
  const {
    person,
    isLoading,
    error,
    activeRole,
    creditGroups,
    savedCredits,
    pick,
    isAuthed,
    followState,
    onToggleLike,
    onToggleSubscribe,
    openTitle,
    blurTimeoutRef,
    savedCount,
    title,
    setTitle,
    setIsInputFocused,
    isSearchOpen,
    suggestions,
    isFetchingSuggestions,
    isSuggestionSaved,
    handleSearchToggle,
    handleSearchClose,
    handleSearchSubmit,
    handleSuggestionSelect,
    handleNav,
  } = usePersonDetails();

  return (
    <main className="page page--details page--person">
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
        <div className="details-page-layer person-page-layer">
          {isLoading && !person ? (
            <section className="person-hero person-hero--skeleton">
              <div className="person-hero__inner">
                <div className="person-hero__layout">
                  <div className="person-hero__photo skeleton-block" />
                  <div className="person-hero__main">
                    <div className="skeleton-line skeleton-line--tiny skeleton-block" />
                    <div className="skeleton-line skeleton-line--title skeleton-block" />
                    <div className="skeleton-line skeleton-block" />
                    <div className="skeleton-line skeleton-line--short skeleton-block" />
                  </div>
                </div>
              </div>
            </section>
          ) : person ? (
            <>
              <PersonHero
                person={person}
                activeRole={activeRole}
                isAuthed={isAuthed}
                followState={followState}
                onBack={() => router.back()}
                onToggleLike={onToggleLike}
                onToggleSubscribe={onToggleSubscribe}
              />

              {pick ? (
                <Reveal>
                  <PersonRecommendation
                    pick={pick}
                    personName={person.name}
                    onSelect={openTitle}
                  />
                </Reveal>
              ) : null}

              {savedCredits.length > 0 ? (
                <Reveal>
                  <PersonSavedStrip entries={savedCredits} onSelect={openTitle} />
                </Reveal>
              ) : null}

              {creditGroups.map((group) => (
                <Reveal key={group.role}>
                  <PersonFilmographySection
                    group={group}
                    isPrimary={group.role === activeRole}
                    onSelect={openTitle}
                  />
                </Reveal>
              ))}
            </>
          ) : null}

          {error ? <p className="hint details-error">{error}</p> : null}
        </div>
      </AppPageShell>
    </main>
  );
}
