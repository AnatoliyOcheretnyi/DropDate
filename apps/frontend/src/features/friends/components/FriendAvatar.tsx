"use client";

import { useMemo } from "react";

type Props = {
  label: string;
  size?: "sm" | "md" | "lg" | "xl";
};

// Deterministic per-user tint: a small hue shift off the brand mint so each
// friend's avatar/cover is recognizably "theirs" without leaving the palette.
export function friendHue(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) % 997;
  }
  return (hash % 61) - 30; // -30..+30deg
}

export function FriendAvatar({ label, size = "md" }: Props) {
  const initials = label.slice(0, 2).toUpperCase();
  const hue = useMemo(() => friendHue(label), [label]);
  return (
    <div
      className={`friend-avatar friend-avatar--${size}`}
      style={{ filter: `hue-rotate(${hue}deg)` }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
