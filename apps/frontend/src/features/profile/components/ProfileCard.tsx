"use client";

import { copy } from "../../../../lib/strings";

type Props = {
  initials: string;
  email: string | null;
  loginPrompt: string;
  authLoading: boolean;
  isAuthenticated: boolean;
  onSignOut: () => void;
  onSignIn: () => void;
};

export function ProfileCard({
  initials,
  email,
  loginPrompt,
  authLoading,
  isAuthenticated,
  onSignOut,
  onSignIn,
}: Props) {
  return (
    <div className="profile-card">
      <div className="profile-id">
        <div className="profile-avatar">{initials}</div>
        <div>
          <p className="profile-title">{copy.auth.profile}</p>
          <p className="profile-subtitle">{email || loginPrompt}</p>
        </div>
      </div>
      <div className="profile-actions">
        {isAuthenticated ? (
          <button type="button" className="secondary danger" onClick={onSignOut}>
            {copy.auth.signOut}
          </button>
        ) : (
          <button
            type="button"
            className="secondary"
            onClick={onSignIn}
            disabled={authLoading}
          >
            {copy.auth.signIn}
          </button>
        )}
      </div>
    </div>
  );
}
