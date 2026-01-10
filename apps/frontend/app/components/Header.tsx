"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { copy } from "../../lib/strings";
import { useAuth } from "../state/auth";
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
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const router = useRouter();

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
