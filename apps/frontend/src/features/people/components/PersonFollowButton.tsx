"use client";

import { useFollowedPeople } from "../hooks/useFollowedPeople";
import type { PersonRole } from "../store/followedPeopleStore";

type Props = {
  tmdbId: number;
  name: string;
  role: PersonRole;
  profileUrl?: string;
  className?: string;
  /** A friend's grid says "Стежити теж" instead of the bare "Стежити". */
  followLabel?: string;
  followingLabel?: string;
};

export function PersonFollowButton({
  tmdbId,
  name,
  role,
  profileUrl,
  className,
  followLabel = "Стежити",
  followingLabel = "Відстежується",
}: Props) {
  // toggleLike, not the bare store toggle: a follow written only to
  // localStorage is wiped by the next sync with the backend.
  const { isFollowing, toggleLike } = useFollowedPeople();
  const following = isFollowing(tmdbId);

  return (
    <button
      type="button"
      className={`person-follow${following ? " is-following" : ""}${
        className ? ` ${className}` : ""
      }`}
      aria-pressed={following}
      onClick={(event) => {
        event.stopPropagation();
        toggleLike({ tmdbId, name, role, profileUrl });
      }}
    >
      <span className="person-follow__icon" aria-hidden="true">
        {following ? "✓" : "+"}
      </span>
      {following ? followingLabel : followLabel}
    </button>
  );
}
