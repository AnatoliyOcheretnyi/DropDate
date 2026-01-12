"use client";

import { useEffect, useMemo, useState } from "react";
import { copy } from "../../lib/strings";
import { useAuth } from "../../app/state/auth";

type Mode = "login" | "register";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: Mode;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export function AuthModal({ isOpen, onClose, initialMode = "login" }: Props) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setMode(initialMode);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

  const submitLabel = useMemo(
    () => (mode === "login" ? copy.auth.submitLogin : copy.auth.submitRegister),
    [mode]
  );

  const title = mode === "login" ? copy.auth.loginTitle : copy.auth.registerTitle;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedEmail = normalizeEmail(email);
    if (!trimmedEmail || !password) {
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setError(copy.auth.errorPasswordMismatch);
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await login(trimmedEmail, password);
      } else {
        await register(trimmedEmail, password);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.auth.errorGeneric);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="auth-modal">
      <button type="button" className="auth-overlay" onClick={onClose} aria-hidden />
      <div className="auth-card" role="dialog" aria-modal="true" aria-label={title}>
        <div className="auth-header">
          <h2>{title}</h2>
          <button
            type="button"
            className="auth-close"
            onClick={onClose}
            aria-label={copy.auth.closeLabel}
          >
            ✕
          </button>
        </div>
        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            {copy.auth.loginTitle}
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            {copy.auth.registerTitle}
          </button>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>{copy.auth.emailLabel}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={copy.auth.emailPlaceholder}
              autoComplete="email"
              required
            />
          </label>
          <label>
            <span>{copy.auth.passwordLabel}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={copy.auth.passwordPlaceholder}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </label>
          {mode === "register" && (
            <label>
              <span>{copy.auth.confirmPasswordLabel}</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={copy.auth.confirmPasswordPlaceholder}
                autoComplete="new-password"
                required
              />
            </label>
          )}
          {mode === "register" && (
            <p className="auth-helper">
              <strong>{copy.auth.helperTitle}</strong>
              <span>{copy.auth.helperText}</span>
            </p>
          )}
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? copy.auth.loading : submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
