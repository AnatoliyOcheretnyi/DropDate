"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { copy } from "../shared/lib/strings";
import { useFriends } from "../features/friends/hooks/useFriends";
import { useFollowedPeople } from "../features/people/hooks/useFollowedPeople";
import { useChangelogSeen } from "../features/changelog/hooks/useChangelogSeen";

type MenuIcon =
  | "bookmark"
  | "users"
  | "star"
  | "calendar"
  | "sparkles"
  | "terminal"
  | "logout";

const ICONS: Record<MenuIcon, ReactNode> = {
  bookmark: (
    <path d="M6 3h12a2 2 0 0 1 2 2v16l-8-4-8 4V5a2 2 0 0 1 2-2Z" fill="currentColor" />
  ),
  users: (
    <path
      d="M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7.5 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5v1H2v-1Zm15.5-4.6c2.6.5 4.5 2.2 4.5 4.6v1h-4.2v-1c0-1.7-.8-3.2-2-4.3l1.7-.3Z"
      fill="currentColor"
    />
  ),
  star: (
    <path
      d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.9l-5.8 3.05 1.1-6.47-4.7-4.58 6.5-.95L12 2.5Z"
      fill="currentColor"
    />
  ),
  calendar: (
    <path
      d="M7 2v2h10V2h2v2h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V2h2ZM4 9v11h16V9H4Z"
      fill="currentColor"
    />
  ),
  sparkles: (
    <path
      d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Zm6.5 11l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6Z"
      fill="currentColor"
    />
  ),
  terminal: (
    <path
      d="M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm3.7 4.3L5.3 9.7 7.6 12l-2.3 2.3 1.4 1.4L11 12 6.7 8.3ZM12 15h6v-1.6h-6V15Z"
      fill="currentColor"
    />
  ),
  logout: (
    <path
      d="M10 3v2H5v14h5v2H3V3h7Zm6.2 4.2 4.8 4.8-4.8 4.8-1.4-1.4 2.4-2.4H9v-2h8.2l-2.4-2.4 1.4-1.4Z"
      fill="currentColor"
    />
  ),
};

type MenuItem = {
  key: string;
  label: string;
  icon: MenuIcon;
  href: string;
  count?: number;
  badge?: number;
  dot?: boolean;
  danger?: boolean;
  onSelect?: () => void;
};

type Props = {
  email: string;
  username: string;
  initials: string;
  savedCount: number;
  isSuperuser: boolean;
  onClose: () => void;
  onSignOut: () => void | Promise<void>;
};

/**
 * Mounted only while the popover is open, so the friend and follow counts are
 * fetched when the menu is actually looked at — not on every page for every
 * signed-in user.
 */
export function ProfileMenu({
  email,
  username,
  initials,
  savedCount,
  isSuperuser,
  onClose,
  onSignOut,
}: Props) {
  const router = useRouter();
  const { friends, incoming } = useFriends();
  const { people } = useFollowedPeople();
  const { hasUnseen, markSeen } = useChangelogSeen();
  const listRef = useRef<HTMLDivElement | null>(null);

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  const groups = useMemo(() => {
    const mine: MenuItem[] = [
      {
        key: "saved",
        label: copy.header.savedList,
        icon: "bookmark",
        href: "/saved",
        count: savedCount,
      },
      {
        key: "friends",
        label: "Друзі",
        icon: "users",
        href: "/friends",
        count: friends.length,
        badge: incoming.length,
      },
      {
        key: "people",
        label: "Люди",
        icon: "star",
        href: "/profile?tab=people",
        count: people.length,
      },
    ];

    const app: MenuItem[] = [
      {
        key: "calendar",
        label: "Календар релізів",
        icon: "calendar",
        href: "/calendar",
      },
      {
        key: "changelog",
        label: "Що нового",
        icon: "sparkles",
        href: "/changelog",
        dot: hasUnseen,
        onSelect: markSeen,
      },
    ];

    if (isSuperuser) {
      app.push({
        key: "dev",
        label: "Dev-панель",
        icon: "terminal",
        href: "/profile/dev",
      });
    }

    return [
      { key: "mine", title: "Моє", items: mine },
      { key: "app", title: "Застосунок", items: app },
    ];
  }, [
    friends.length,
    hasUnseen,
    incoming.length,
    isSuperuser,
    markSeen,
    people.length,
    savedCount,
  ]);

  // Arrows move within the menu, Esc gives focus back to the avatar button.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }
      event.preventDefault();
      const items = Array.from(
        listRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']") ?? []
      );
      if (items.length === 0) {
        return;
      }
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = (current + step + items.length) % items.length;
      items[next]?.focus();
    },
    [onClose]
  );

  useEffect(() => {
    const first = listRef.current?.querySelector<HTMLButtonElement>("[role='menuitem']");
    first?.focus();
  }, []);

  const renderItem = (item: MenuItem) => (
    <button
      key={item.key}
      type="button"
      role="menuitem"
      className={`profile-menu-item${item.danger ? " profile-menu-item--danger" : ""}`}
      onClick={() => {
        item.onSelect?.();
        if (item.danger) {
          onClose();
          void onSignOut();
          return;
        }
        go(item.href);
      }}
    >
      <span className="profile-menu-item__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">{ICONS[item.icon]}</svg>
      </span>
      <span className="profile-menu-item__label">{item.label}</span>
      {item.badge ? (
        <span className="profile-menu-item__badge">{item.badge}</span>
      ) : null}
      {item.dot ? (
        <span className="profile-menu-item__dot" aria-label="Є нові записи" />
      ) : null}
      {typeof item.count === "number" ? (
        <span className="profile-menu-item__count">{item.count}</span>
      ) : null}
    </button>
  );

  return (
    <div
      className="profile-menu"
      role="menu"
      aria-label={copy.auth.profile}
      ref={listRef}
      onKeyDown={handleKeyDown}
    >
      <span className="profile-menu__handle" aria-hidden="true" />

      <button
        type="button"
        role="menuitem"
        className="profile-menu-head"
        onClick={() => go("/profile")}
      >
        <span className="profile-menu-head__avatar" aria-hidden="true">
          {initials}
        </span>
        <span className="profile-menu-head__meta">
          {username ? (
            <strong>@{username}</strong>
          ) : (
            <strong className="profile-menu-head__cta">Додати юзернейм</strong>
          )}
          <span>{email}</span>
        </span>
      </button>

      {groups.map((group) => (
        <div key={group.key} className="profile-menu-group">
          <p className="profile-menu-group__title">{group.title}</p>
          {group.items.map(renderItem)}
        </div>
      ))}

      <div className="profile-menu-divider" role="separator" />

      {renderItem({
        key: "logout",
        label: copy.auth.signOut,
        icon: "logout",
        href: "/",
        danger: true,
      })}
    </div>
  );
}
