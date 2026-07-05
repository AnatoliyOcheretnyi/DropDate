"use client";

import type { ReactNode } from "react";
import { Header, type ViewKey } from "./Header";
import { SearchOverlay, type SearchOverlayProps } from "./SearchOverlay";

type Props = {
  active: ViewKey;
  savedCount: number;
  onChange: (view: ViewKey) => void;
  isSearchOpen: boolean;
  onSearchToggle: () => void;
  onSearchClose: () => void;
  searchOverlay?: SearchOverlayProps;
  children: ReactNode;
};

export function AppPageShell({
  active,
  savedCount,
  onChange,
  isSearchOpen,
  onSearchToggle,
  onSearchClose,
  searchOverlay,
  children,
}: Props) {
  return (
    <>
      <Header
        active={active}
        savedCount={savedCount}
        onChange={onChange}
        isSearchOpen={isSearchOpen}
        onSearchToggle={onSearchToggle}
        onSearchClose={onSearchClose}
      />
      {searchOverlay ? <SearchOverlay {...searchOverlay} /> : null}
      {children}
    </>
  );
}
