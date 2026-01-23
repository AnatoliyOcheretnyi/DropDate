"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "../../../widgets/Header";
import { SearchOverlay } from "../../../widgets/SearchOverlay";
import { AuthorizedSavedList } from "../components/AuthorizedSavedList";
import { ProfileTabs } from "../../profile/components/ProfileTabs";
import { copy } from "../../../shared/lib/strings";
import { useSavedPage } from "../hooks/useSavedPage";
import { useAuth } from "../../../shared/state/auth";
import type { SavedRelease } from "../../../shared/types/releases";
import type { TabDefinition, TabKey } from "../../profile/types";

export function SavedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("follow");
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

  const tabs: TabDefinition[] = [
    { key: "follow", label: copy.lists.follow },
    { key: "watchlist", label: copy.lists.watchlist },
    { key: "favorite", label: copy.lists.favorite },
    { key: "watched", label: copy.lists.watched },
    { key: "disliked", label: copy.lists.disliked },
  ];

  const normalizeItemLists = (item: SavedRelease): TabKey[] => {
    if (item.listTypes && item.listTypes.length > 0) {
      return item.listTypes;
    }
    return ["follow"];
  };

  const tabItems = saved.filter((item) =>
    normalizeItemLists(item).includes(activeTab)
  );

  return (
    <main className="page page--saved">
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
        <ProfileTabs
          tabs={tabs}
          activeTab={activeTab}
          isAuthenticated={Boolean(user)}
          onChange={setActiveTab}
        />
        {!isStorageReady ? (
          <p className="hint">{copy.hints.loadingList}</p>
        ) : tabItems.length === 0 ? (
          <p className="hint">{copy.hints.listEmpty}</p>
        ) : (
          <AuthorizedSavedList
            items={tabItems}
            onRemove={(item) => removeRelease(item.id)}
            actionsDisabled={!isStorageReady}
            groupByDate={activeTab === "follow"}
          />
        )}
      </section>
    </main>
  );
}
