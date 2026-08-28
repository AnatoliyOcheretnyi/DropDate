"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppPageShell } from "../../../widgets/AppPageShell";
import { SearchResultsGrid } from "../../../widgets/SearchResultsGrid";
import { copy } from "../../../shared/lib/strings";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { useSearchPage } from "../../search/hooks/useSearchPage";
import { VibeQueryBar } from "../components/VibeQueryBar";
import { VibeUnderstanding } from "../components/VibeUnderstanding";
import { useVibeSearch } from "../hooks/useVibeSearch";
import { EXAMPLE_PHRASES } from "../types";

const MEDIA_TABS: { label: string; value: string[] }[] = [
  { label: "Усе", value: [] },
  { label: "Фільми", value: ["movie"] },
  { label: "Серіали", value: ["tv"] },
];

function VibeScreenContent() {
  const router = useRouter();
  const { getListTypes, setSuggestionLists, saved } = useSavedReleases();
  const {
    addGenre,
    addTheme,
    error,
    hasMore,
    hiddenCount,
    initialPhrase,
    labels,
    loadMore,
    phrase,
    plan,
    removeLabel,
    reranked,
    results,
    search,
    setMediaTypes,
    setPhrase,
    status,
  } = useVibeSearch();
  const searchPage = useSearchPage();

  // A shared link (/vibe?q=…) must run its own search on arrival.
  useEffect(() => {
    if (initialPhrase.trim().length >= 3) {
      search(initialPhrase);
    }
    // Only on mount: later changes come from the input itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading = status === "loading";
  const activeMedia = (plan?.mediaTypes ?? []).join(",");

  return (
    <main className="page page--vibe">
      <AppPageShell
        active="home"
        savedCount={saved.length}
        onChange={(view) => router.push(view === "saved" ? "/saved" : "/")}
        isSearchOpen={searchPage.isSearchOpen}
        onSearchToggle={searchPage.handleSearchToggle}
        onSearchClose={searchPage.handleSearchClose}
        searchOverlay={{
          title: searchPage.title,
          isLoading: false,
          isOpen: searchPage.isSearchOpen,
          onClose: searchPage.handleSearchClose,
          onChange: searchPage.setTitle,
          onSubmit: searchPage.handleSearchSubmit,
          onFocus: () => undefined,
          onBlur: () => undefined,
          suggestions: searchPage.suggestions,
          isFetchingSuggestions: searchPage.isFetchingSuggestions,
          onSuggestionSelect: searchPage.handleSuggestionSelect,
          isSuggestionSaved: searchPage.isSuggestionSaved,
        }}
      >
        <section className="vibe">
          <div className="vibe-hero">
            <p className="eyebrow">Пошук за асоціацією</p>
            <h1>Опиши, що хочеш подивитись</h1>
            <VibeQueryBar
              value={phrase}
              onChange={setPhrase}
              onSubmit={() => search(phrase)}
              isLoading={isLoading}
              size="lg"
            />
            <div className="vibe-examples">
              <span>Спробуй</span>
              {EXAMPLE_PHRASES.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="vibe-example"
                  onClick={() => {
                    setPhrase(example);
                    search(example);
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {error ? <p className="vibe-error">{error}</p> : null}

          {plan && labels.length > 0 ? (
            <>
              <VibeUnderstanding
                plan={plan}
                labels={labels}
                isLoading={isLoading}
                onRemove={removeLabel}
                onAddTheme={addTheme}
                onAddGenre={addGenre}
                onReset={() => {
                  setPhrase("");
                  router.replace("/vibe", { scroll: false });
                }}
              />

              <div className="vibe-toolbar">
                <div className="vibe-tabs" role="group" aria-label="Тип">
                  {MEDIA_TABS.map((tab) => {
                    const isActive = tab.value.join(",") === activeMedia;
                    return (
                      <button
                        key={tab.label}
                        type="button"
                        className={`vibe-tab${isActive ? " is-active" : ""}`}
                        aria-pressed={isActive}
                        onClick={() => setMediaTypes(tab.value)}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                <p className="vibe-count">
                  {isLoading
                    ? "Шукаємо збіги…"
                    : `${results.length} збігів${
                        hiddenCount > 0 ? ` · ${hiddenCount} вже у списках` : ""
                      }${reranked ? " · відсортовано за змістом" : ""}`}
                </p>
              </div>
            </>
          ) : null}

          {plan && labels.length === 0 && status === "ready" ? (
            <div className="vibe-empty">
              <span aria-hidden="true">🤔</span>
              <h2>Не зрозуміли, що шукаємо</h2>
              <p>
                Спробуй описати інакше: жанр, настрій, про що фільм. Наприклад:
                «комедія з привидами» або «повільна драма про сімʼю».
              </p>
            </div>
          ) : null}

          {labels.length > 0 ? (
            <SearchResultsGrid
              items={results}
              isLoading={isLoading && results.length === 0}
              onSelect={(item) => router.push(`/title/${item.mediaType}/${item.id}`)}
              getListTypes={getListTypes}
              onChangeLists={(suggestion, next) =>
                setSuggestionLists(suggestion, next, {
                  title: suggestion.title,
                  type: suggestion.mediaType === "movie" ? "movie" : "series",
                  nextRelease: "",
                  source: "tmdb",
                  posterUrl: suggestion.posterUrl,
                  status: "released",
                })
              }
              title="Збіги"
              emptyLabel="Нічого не знайшлось під цю комбінацію. Прибери один із чипів."
              showEmpty
            />
          ) : null}

          {hasMore && results.length > 0 ? (
            <button
              type="button"
              className="vibe-more"
              onClick={loadMore}
              disabled={isLoading}
            >
              {isLoading ? copy.hints.loadingResults : copy.actions.loadMore}
            </button>
          ) : null}
        </section>
      </AppPageShell>
    </main>
  );
}

export function VibeScreen() {
  return (
    <Suspense fallback={<main className="page page--vibe" />}>
      <VibeScreenContent />
    </Suspense>
  );
}
