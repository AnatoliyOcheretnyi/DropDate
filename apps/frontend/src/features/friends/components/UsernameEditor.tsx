"use client";

import { useState } from "react";
import { useAuth } from "../../../shared/state/auth";

export function UsernameEditor() {
  const { user, updateUsername } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(user?.username ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!user) {
    return null;
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        className="username-editor__display"
        onClick={() => {
          setValue(user.username);
          setError(null);
          setIsEditing(true);
        }}
      >
        @{user.username || "вибрати юзернейм"}
        <span aria-hidden="true">✎</span>
      </button>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await updateUsername(value.trim());
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося зберегти");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="username-editor">
      <span className="username-editor__at">@</span>
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={24}
        autoFocus
      />
      <button type="button" className="btn-pill btn-pill--accent" onClick={handleSave} disabled={isSaving}>
        Зберегти
      </button>
      <button
        type="button"
        className="btn-pill btn-pill--ghost"
        onClick={() => setIsEditing(false)}
        disabled={isSaving}
      >
        Скасувати
      </button>
      {error ? <p className="username-editor__error">{error}</p> : null}
    </div>
  );
}
