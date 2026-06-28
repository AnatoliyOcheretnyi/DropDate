"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { copy } from "../shared/lib/strings";
import { useAuth } from "../shared/state/auth";
import { useNotifications } from "../features/notifications/hooks/useNotifications";
import type { NotificationItem } from "../features/notifications/types/notifications";
import { AuthModal } from "./AuthModal";

export type ViewKey = "home" | "saved" | "games" | "mood";

type Props = {
  active: ViewKey;
  savedCount: number;
  onChange: (view: ViewKey) => void;
  isSearchOpen: boolean;
  onSearchToggle: () => void;
  onSearchClose: () => void;
};

export function Header({
  active,
  savedCount,
  onChange,
  isSearchOpen,
  onSearchToggle,
  onSearchClose,
}: Props) {
  const { user, isLoading: authLoading, logout } = useAuth();
  const showAuthLoading = authLoading && !user;
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const {
    items: notifications,
    unreadCount,
    isLoading: notificationsLoading,
    refresh: refreshNotifications,
    markAllRead,
  } = useNotifications();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isNotificationsOpen) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      if (!notificationsRef.current) {
        return;
      }
      if (event.target instanceof Node && notificationsRef.current.contains(event.target)) {
        return;
      }
      setIsNotificationsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (!isProfileOpen) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      if (!profileRef.current) {
        return;
      }
      if (event.target instanceof Node && profileRef.current.contains(event.target)) {
        return;
      }
      setIsProfileOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isProfileOpen]);

  const formatNotificationDate = (value?: string) => {
    if (!value) {
      return "";
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat("uk-UA", {
      day: "numeric",
      month: "long",
    }).format(parsed);
  };

  const formatEpisodeLabel = (item: NotificationItem) => {
    if (item.seasonNumber && item.episodeNumber) {
      return `S${item.seasonNumber}E${item.episodeNumber}`;
    }
    return "";
  };

  const formatNotificationTitle = (item: NotificationItem) => {
    if (item.eventType === "episode_release") {
      const episodeLabel = formatEpisodeLabel(item);
      return episodeLabel
        ? `Вийшла серія ${episodeLabel}`
        : "Вийшла нова серія";
    }
    return "Вийшов фільм";
  };

  const handleNotificationsToggle = useCallback(async () => {
    if (!user) {
      return;
    }
    if (!isNotificationsOpen) {
      setIsNotificationsOpen(true);
      refreshNotifications();
      if (unreadCount > 0) {
        await markAllRead();
      }
      return;
    }
    setIsNotificationsOpen(false);
  }, [isNotificationsOpen, markAllRead, refreshNotifications, unreadCount, user]);

  const handleProfileToggle = useCallback(() => {
    if (!user) {
      return;
    }
    setIsProfileOpen((prev) => !prev);
  }, [user]);

  const initials = `${(user?.email?.[0] || "U").toUpperCase()}${(
    user?.email?.[1] || ""
  ).toUpperCase()}`;

  const handleNotificationClick = useCallback(
    (item: NotificationItem) => {
      if (!item.tmdbId) {
        return;
      }
      setIsNotificationsOpen(false);
      router.push(`/title/${item.mediaType}/${item.tmdbId}`);
    },
    [router]
  );

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="header-brand-cluster">
          <Link href="/" className="header-brand" aria-label={copy.appName}>
            <span className="brand-mark">
              <Image
                src="/logo.png"
                alt={copy.appName}
                className="brand-logo"
                width={56}
                height={56}
                priority
              />
            </span>
            <div className="brand-text">
              <span className="brand-kicker">Release radar</span>
              <span className="brand-title">{copy.appName}</span>
              <span className="brand-subtitle">{copy.tagline}</span>
            </div>
          </Link>
          <nav className="header-nav" aria-label="Основна навігація">
            <button
              type="button"
              className={`header-nav-link${active === "home" ? " active" : ""}`}
              onClick={() => onChange("home")}
            >
              Головна
            </button>
            <Link
              href="/mood"
              className={`header-nav-link${active === "mood" ? " active" : ""}`}
            >
              Настрій
            </Link>
            <Link
              href="/games"
              className={`header-nav-link${active === "games" ? " active" : ""}`}
            >
              Ігри
            </Link>
            {user ? (
              <button
                type="button"
                className={`header-nav-link${active === "saved" ? " active" : ""}`}
                onClick={() => onChange("saved")}
              >
                <span>{copy.header.savedList}</span>
                <span className="header-nav-count">{savedCount}</span>
              </button>
            ) : null}
          </nav>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="header-icon header-icon--search"
            aria-label={
              isSearchOpen ? copy.header.searchCloseLabel : copy.header.searchOpenLabel
            }
            onClick={isSearchOpen ? onSearchClose : onSearchToggle}
          >
            {isSearchOpen ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6 6.4 5Z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0-2a9 9 0 1 0 5.66 15.99l4.68 4.68 1.41-1.41-4.68-4.68A9 9 0 0 0 11 2Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
          {!showAuthLoading && user && (
            <div className="notifications-shell" ref={notificationsRef}>
              <button
                type="button"
                className={`notifications-button${isNotificationsOpen ? " active" : ""}`}
                onClick={() => void handleNotificationsToggle()}
                aria-label="Сповіщення"
                aria-expanded={isNotificationsOpen}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 3a6 6 0 0 1 6 6v3.1l1.6 2.7a1 1 0 0 1-.86 1.5H5.26a1 1 0 0 1-.86-1.5l1.6-2.7V9a6 6 0 0 1 6-6Zm0 18a2.5 2.5 0 0 1-2.45-2h4.9A2.5 2.5 0 0 1 12 21Z"
                    fill="currentColor"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="notifications-badge">{unreadCount}</span>
                )}
              </button>
              {isNotificationsOpen && (
                <div className="notifications-popover">
                  <div className="notifications-header">
                    <strong>Активність</strong>
                    {notificationsLoading ? (
                      <span className="notifications-hint">Оновлюємо…</span>
                    ) : (
                      <span className="notifications-hint">
                        {unreadCount > 0 ? `Нових: ${unreadCount}` : "Все прочитано"}
                      </span>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="notifications-empty">
                      Поки тихо — нові релізи зʼявляться тут.
                    </div>
                  ) : (
                    <div className="notifications-list">
                      {notifications.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`notification-item${item.readAt ? "" : " unread"}`}
                          onClick={() => handleNotificationClick(item)}
                        >
                          <div className="notification-media">
                            {item.posterUrl ? (
                              <img src={item.posterUrl} alt="" loading="lazy" />
                            ) : (
                              <span>{item.title.slice(0, 1)}</span>
                            )}
                          </div>
                          <div className="notification-body">
                            <div className="notification-title">
                              {formatNotificationTitle(item)}
                            </div>
                            <div className="notification-meta">
                              <span>{item.title}</span>
                              {item.releaseDate ? (
                                <span>{formatNotificationDate(item.releaseDate)}</span>
                              ) : null}
                            </div>
                            {item.episodeName ? (
                              <div className="notification-episode">
                                {item.episodeName}
                              </div>
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {showAuthLoading ? (
            <div className="header-auth-skeleton" aria-hidden="true" />
          ) : !user ? (
            <button
              type="button"
              className="header-link header-auth"
              onClick={() => setIsAuthOpen(true)}
              disabled={authLoading}
            >
              {copy.auth.signIn}
            </button>
          ) : (
            <div className="header-profile-shell" ref={profileRef}>
              <button
                type="button"
                className={`profile-button${isProfileOpen ? " active" : ""}`}
                onClick={handleProfileToggle}
                aria-label={copy.auth.profile}
                aria-expanded={isProfileOpen}
              >
                <span className="profile-initials">{initials}</span>
              </button>
              {isProfileOpen && (
                <div className="profile-popover">
                  <div className="profile-popover-card">
                    <div className="profile-avatar">{initials}</div>
                    <div className="profile-meta">
                      <strong>{copy.auth.profile}</strong>
                      <span>{user.email}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="profile-popover-action"
                    onClick={() => {
                      setIsProfileOpen(false);
                      router.push("/profile");
                    }}
                  >
                    {copy.auth.profile}
                  </button>
                  <button
                    type="button"
                    className="profile-popover-action"
                    onClick={() => {
                      setIsProfileOpen(false);
                      router.push("/saved");
                    }}
                  >
                    {copy.header.savedList}
                  </button>
                  <button
                    type="button"
                    className="profile-popover-action profile-popover-action--danger"
                    onClick={async () => {
                      setIsProfileOpen(false);
                      await logout();
                    }}
                  >
                    {copy.auth.signOut}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <nav className="mobile-nav" aria-label="Мобільна навігація">
        <button
          type="button"
          className={active === "home" ? "active" : ""}
          onClick={() => onChange("home")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 11.2 12 4l9 7.2V21h-6v-6H9v6H3v-9.8Z" fill="currentColor" />
          </svg>
          <span>Головна</span>
        </button>
        <button
          type="button"
          className={isSearchOpen ? "active" : ""}
          onClick={isSearchOpen ? onSearchClose : onSearchToggle}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0-2a9 9 0 1 0 5.66 15.99l4.68 4.68 1.41-1.41-4.68-4.68A9 9 0 0 0 11 2Z"
              fill="currentColor"
            />
          </svg>
          <span>Пошук</span>
        </button>
        <button
          type="button"
          className={active === "mood" ? "active" : ""}
          onClick={() => router.push("/mood")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16ZM8.5 9.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM7.6 14.4a5.5 5.5 0 0 0 8.8 0l1.6 1.2a7.5 7.5 0 0 1-12 0l1.6-1.2Z"
              fill="currentColor"
            />
          </svg>
          <span>Настрій</span>
        </button>
        <button
          type="button"
          className={active === "games" ? "active" : ""}
          onClick={() => router.push("/games")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M7 8h10a4 4 0 0 1 4 4v.5a3.5 3.5 0 0 1-6.2 2.2l-.4-.5H9.6l-.4.5A3.5 3.5 0 0 1 3 12.5V12a4 4 0 0 1 4-4Zm0-2a6 6 0 0 0-6 6v.5a5.5 5.5 0 0 0 9.8 3.5h2.4A5.5 5.5 0 0 0 23 12.5V12a6 6 0 0 0-6-6H7Z"
              fill="currentColor"
            />
          </svg>
          <span>Ігри</span>
        </button>
        {user ? (
          <>
            <button
              type="button"
              className={active === "saved" ? "active" : ""}
              onClick={() => onChange("saved")}
            >
              <span className="mobile-nav-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 3h12a2 2 0 0 1 2 2v16l-8-4-8 4V5a2 2 0 0 1 2-2Z" fill="currentColor" />
                </svg>
                {savedCount > 0 ? <b>{savedCount}</b> : null}
              </span>
              <span>Список</span>
            </button>
            <button type="button" onClick={() => router.push("/profile")}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5C21 16.5 17 14 12 14Z" fill="currentColor" />
              </svg>
              <span>Профіль</span>
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setIsAuthOpen(true)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5C21 16.5 17 14 12 14Z" fill="currentColor" />
            </svg>
            <span>Увійти</span>
          </button>
        )}
      </nav>
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </header>
  );
}
