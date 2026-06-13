"use client";

import { Header } from "../../../widgets/Header";
import { SearchOverlay } from "../../../widgets/SearchOverlay";
import { AuthModal } from "../../../widgets/AuthModal";
import { AuthorizedSavedList } from "../../saved/components/AuthorizedSavedList";
import { useProfile } from "../hooks/useProfile";
import { ProfileStats } from "../components/ProfileStats";
import { ProfileTabs } from "../components/ProfileTabs";
import { ProfileCard } from "../components/ProfileCard";

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
        <div className="profile-hero">
          <div className="profile-hero-copy">
            <p className="eyebrow">Твій простір</p>
            <h1>{user ? "Профіль і бібліотека" : "Персональний профіль"}</h1>
            <p>
              Керуй списками, оцінками та історією переглядів в одному місці.
            </p>
          </div>
          <ProfileCard
            initials={initials}
            email={user?.email || null}
            loginPrompt={listCopy.loginPrompt}
            authLoading={authLoading}
            isAuthenticated={Boolean(user)}
            onSignOut={handleLogout}
            onSignIn={() => setIsAuthOpen(true)}
          />
        </div>

        <div className="profile-dashboard">
          <ProfileTabs
            tabs={tabs}
            activeTab={activeTab}
            isAuthenticated={Boolean(user)}
            onChange={setActiveTab}
          />
          <ProfileStats
            total={tabItems.length}
            middleStat={middleStat}
            seriesCount={seriesCount}
            statsCopy={{ total: statsCopy.total, series: statsCopy.series }}
          />
        </div>

        {tabItems.length === 0 ? (
          <div className="profile-empty">
            <span aria-hidden="true">＋</span>
            <h2>Список порожній</h2>
            <p>{listCopy.empty}</p>
            <button type="button" onClick={() => handleNav("home")}>
              Знайти тайтли
            </button>
          </div>
        ) : (
          <AuthorizedSavedList
            items={tabItems}
            onRemove={handleRemoveFromTab}
            groupByDate={activeTab === "follow"}
          />
        )}
      </section>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </main>
  );
}
