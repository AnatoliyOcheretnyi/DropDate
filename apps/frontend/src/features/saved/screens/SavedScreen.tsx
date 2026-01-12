"use client";

import { useRouter } from "next/navigation";
import { Header } from "../../../widgets/Header";
import { SearchOverlay } from "../../../widgets/SearchOverlay";
import { AuthorizedSavedList } from "../components/AuthorizedSavedList";
import { copy } from "../../../shared/lib/strings";
import { useSavedPage } from "../hooks/useSavedPage";

export function SavedScreen() {
  const router = useRouter();
  const {
    blurTimeoutRef,
    handleRefreshAllClick,
    handleSearchClose,
    handleSearchToggle,
    handleSubmit,
    handleSuggestionSelect,
    isFetchingSuggestions,
    isRefreshing,
    isSearchOpen,
    isStorageReady,
    isSuggestionSaved,
    refreshMessage,
    removeRelease,
    saved,
    savedCount,
    setTitle,
    suggestions,
    title,
  } = useSavedPage();

  return (
    <main className="page">
      <Header
        active="saved"
        savedCount={savedCount}
        onChange={(view) => {
          if (view === "saved") {
            return;
          }
          router.push("/");
        }}
        isSearchOpen={isSearchOpen}
        onSearchToggle={handleSearchToggle}
        onSearchClose={handleSearchClose}
      />
      <SearchOverlay
        title={title}
        isLoading={false}
        isOpen={isSearchOpen}
        onClose={handleSearchClose}
        onChange={(value) => setTitle(value)}
        onSubmit={handleSubmit}
        onFocus={() => undefined}
        onBlur={() => {
          blurTimeoutRef.current = setTimeout(() => {
            // noop
          }, 150);
        }}
        suggestions={suggestions}
        isFetchingSuggestions={isFetchingSuggestions}
        onSuggestionSelect={handleSuggestionSelect}
        isSuggestionSaved={isSuggestionSaved}
      />

      <section className="saved">
        <div className="saved-actions">
          <button
            type="button"
            className="secondary"
            onClick={handleRefreshAllClick}
            disabled={!isStorageReady || saved.length === 0 || isRefreshing}
          >
            {isRefreshing ? copy.actions.updating : copy.actions.updateAll}
          </button>
          {refreshMessage && <p className="hint">{refreshMessage}</p>}
        </div>
        {!isStorageReady ? (
          <p className="hint">{copy.hints.loadingList}</p>
        ) : saved.length === 0 ? (
          <p className="hint">{copy.hints.listEmpty}</p>
        ) : (
          <AuthorizedSavedList
            items={saved}
            onRemove={(item) => removeRelease(item.id)}
            actionsDisabled={!isStorageReady}
          />
        )}
      </section>
    </main>
  );
}
