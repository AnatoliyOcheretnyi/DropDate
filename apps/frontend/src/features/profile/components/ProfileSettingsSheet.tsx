"use client";

import { useEffect } from "react";
import { UsernameEditor } from "../../friends/components/UsernameEditor";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void | Promise<void>;
};

/**
 * The username editor used to sit as a loose card in the hero. It belongs to
 * settings, so it lives behind the gear together with signing out.
 */
export function ProfileSettingsSheet({ isOpen, onClose, onSignOut }: Props) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="profile-sheet" role="dialog" aria-modal="true" aria-label="Налаштування профілю">
      <button
        type="button"
        className="profile-sheet__backdrop"
        aria-label="Закрити налаштування"
        onClick={onClose}
      />
      <div className="profile-sheet__panel">
        <div className="profile-sheet__head">
          <h2>Налаштування</h2>
          <button type="button" className="profile-sheet__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="profile-sheet__block">
          <p className="profile-sheet__label">Юзернейм</p>
          <UsernameEditor />
          <p className="profile-sheet__hint">
            За юзернеймом тебе знаходять друзі — він показується замість email.
          </p>
        </div>

        <button
          type="button"
          className="profile-sheet__signout"
          onClick={() => {
            onClose();
            void onSignOut();
          }}
        >
          Вийти з акаунта
        </button>
      </div>
    </div>
  );
}
