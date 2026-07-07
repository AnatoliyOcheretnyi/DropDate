"use client";

import { useFollowedPeople } from "../hooks/useFollowedPeople";
import type { PersonRole } from "../store/followedPeopleStore";

type Props = {
  tmdbId: number;
  name: string;
  role: PersonRole;
  profileUrl?: string;
  className?: string;
};

export function PersonFollowButton({
  tmdbId,
  name,
  role,
  profileUrl,
  className,
}: Props) {
  const { isFollowing, toggle } = useFollowedPeople();
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
        toggle({ tmdbId, name, role, profileUrl });
      }}
    >
      <span className="person-follow__icon" aria-hidden="true">
        {following ? "✓" : "+"}
      </span>
      {following ? "Відстежується" : "Стежити"}
    </button>
  );
}
