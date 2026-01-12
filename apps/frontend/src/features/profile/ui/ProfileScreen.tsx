"use client";

import { Header } from "../../../../app/components/Header";
import { SearchOverlay } from "../../../../app/components/SearchOverlay";
import { AuthModal } from "../../../../app/components/AuthModal";
import { SavedList } from "../../../../app/components/SavedList";
import { useProfile } from "../hooks/useProfile";
import { ProfileCard } from "./ProfileCard";
import { ProfileStats } from "./ProfileStats";
import { ProfileTabs } from "./ProfileTabs";

export function ProfileScreen() {
  const {
    activeTab,
    authLoading,
    blurTimeoutRef,
    handleLogout,
    handleNav,
    handleRemoveFromTab,
    handleSearchClose,
    handleSearchToggle,
    handleSubmit,
    handleSuggestionSelect,
    initials,
    isAuthOpen,
    isSearchOpen,
    isSuggestionSaved,
    isFetchingSuggestions,
    listCopy,
    middleStat,
    savedCount,
    seriesCount,
    setActiveTab,
    setIsAuthOpen,
    setTitle,
    statsCopy,
    suggestions,
    tabItems,
    tabs,
    title,
    user,
  } = useProfile();

  return (
    <main className="page page--profile">
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
        isLoading={false}
        isOpen={isSearchOpen}
        onClose={handleSearchClose}
        onChange={(value) => setTitle(value)}
        onSubmit={handleSubmit}
        onFocus={() => undefined}
        onBlur={() => {
          blurTimeoutRef.current = setTimeout(() => {}, 150);
        }}
        suggestions={suggestions}
        isFetchingSuggestions={isFetchingSuggestions}
        onSuggestionSelect={handleSuggestionSelect}
        isSuggestionSaved={isSuggestionSaved}
      />

      <section className="profile-shell">
        <ProfileCard
          initials={initials}
          email={user?.email ?? null}
          loginPrompt={listCopy.loginPrompt}
          authLoading={authLoading}
          isAuthenticated={Boolean(user)}
          onSignOut={handleLogout}
          onSignIn={() => setIsAuthOpen(true)}
        />
        <ProfileTabs
          tabs={tabs}
          activeTab={activeTab}
          isAuthenticated={Boolean(user)}
          onChange={setActiveTab}
        />

        {tabItems.length === 0 ? (
          <div className="profile-empty">
            <p>{listCopy.empty}</p>
          </div>
        ) : null}

        <ProfileStats
          total={tabItems.length}
          middleStat={middleStat}
          seriesCount={seriesCount}
          statsCopy={{ total: statsCopy.total, series: statsCopy.series }}
        />

        <SavedList
          items={tabItems}
          onRemove={handleRemoveFromTab}
          groupByDate={activeTab === "follow"}
        />
      </section>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </main>
  );
}
