"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { copy } from "../../lib/strings";
import { useAuth } from "../../app/state/auth";
import { useNotifications } from "../../app/hooks/useNotifications";
import type { NotificationItem } from "../../app/lib/notifications";
import { AuthModal } from "./AuthModal";

type ViewKey = "home" | "saved";

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
  const { user, isLoading: authLoading } = useAuth();
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
        <Link href="/" className="header-brand" aria-label={copy.appName}>
          <Image
            src="/logo.png"
            alt={copy.appName}
            className="brand-logo"
            width={80}
            height={80}
            priority
          />
          <div className="brand-text">
            <span className="brand-title">{copy.appName}</span>
            <span className="brand-subtitle">{copy.tagline}</span>
          </div>
        </Link>
        <div className="header-actions">
          <button
            type="button"
            className="header-icon"
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
          {user && (
            <div className="notifications-shell" ref={notificationsRef}>
              <button
                type="button"
                className={`notifications-button${isNotificationsOpen ? " active" : ""}`}
                onClick={() => void handleNotificationsToggle()}
                aria-label="Сповіщення"
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
          {!user && (
            <button
              type="button"
              className={`header-link${active === "saved" ? " active" : ""}`}
              onClick={() => onChange("saved")}
            >
              {copy.header.savedList} ({savedCount})
            </button>
          )}
          {!user ? (
            <button
              type="button"
              className="header-link header-auth"
              onClick={() => setIsAuthOpen(true)}
              disabled={authLoading}
            >
              {copy.auth.signIn}
            </button>
          ) : (
            <button
              type="button"
              className="header-link header-auth"
              onClick={() => router.push("/profile")}
            >
              {copy.auth.profile}
            </button>
          )}
        </div>
      </div>
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </header>
  );
}
