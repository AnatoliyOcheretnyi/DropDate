"use client";

import { useEffect, useMemo, useState } from "react";
import { copy } from "../shared/lib/strings";
import { AuthError, useAuth } from "../shared/state/auth";

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
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setMode(initialMode);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setVerificationMessage(null);
    setResendMessage(null);
    setResendCooldown(0);
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    document.body.classList.add("modal-open");
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const submitLabel = useMemo(
    () => (mode === "login" ? copy.auth.submitLogin : copy.auth.submitRegister),
    [mode]
  );

  const title = mode === "login" ? copy.auth.loginTitle : copy.auth.registerTitle;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setVerificationMessage(null);
    setResendMessage(null);

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
        onClose();
      } else {
        const result = await register(trimmedEmail, password);
        if (result.status === "verification_required") {
          setVerificationMessage(result.message || copy.auth.verifyText);
          setResendMessage(null);
          return;
        }
        onClose();
      }
    } catch (err) {
      if (err instanceof AuthError && err.code === "email_not_verified") {
        setVerificationMessage(copy.auth.verifyText);
        setResendMessage(null);
        return;
      }
      setError(err instanceof Error ? err.message : copy.auth.errorGeneric);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!resendCooldown) {
      return;
    }
    const id = window.setInterval(() => {
      setResendCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (isResending || resendCooldown > 0) {
      return;
    }
    const trimmedEmail = normalizeEmail(email);
    if (!trimmedEmail) {
      setError(copy.auth.errorGeneric);
      return;
    }
    setIsResending(true);
    setResendMessage(null);
    try {
      const response = await fetch("/api/auth/verify/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const payload = await response.json().catch(() => null);
      if (response.status === 429) {
        const retryAfter = Number(payload?.details?.retryAfterSeconds || 0);
        const cooldown = retryAfter > 0 ? retryAfter : 60;
        setResendCooldown(cooldown);
        setResendMessage(copy.auth.verifyResendCooldown(cooldown));
        return;
      }
      if (payload?.status === "already_verified") {
        setResendMessage(copy.auth.verifyAlreadyVerified);
        return;
      }
      if (!response.ok) {
        setError(payload?.message || copy.auth.errorGeneric);
        return;
      }
      setResendCooldown(60);
      setResendMessage(copy.auth.verifyResent);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.auth.errorGeneric);
    } finally {
      setIsResending(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="auth-modal">
      <button type="button" className="auth-overlay" onClick={onClose} aria-hidden />
      <div
        className="auth-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <aside className="auth-brand-panel">
          <span className="auth-brand-mark">DD</span>
          <div>
            <p className="eyebrow">Твій release radar</p>
            <h2>Не пропускай те, що хочеш подивитися.</h2>
            <p>
              Зберігай тайтли, отримуй дати нових релізів і веди власну
              бібліотеку в одному місці.
            </p>
          </div>
          <div className="auth-brand-points">
            <span>Дати релізів</span>
            <span>Персональні списки</span>
            <span>Сповіщення</span>
          </div>
        </aside>

        <div className="auth-panel">
          <div className="auth-header">
            <div>
              <p className="eyebrow">Обліковий запис</p>
              <h2 id="auth-title">{title}</h2>
            </div>
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
          {verificationMessage ? (
            <div className="auth-verify">
              <span className="auth-verify-icon" aria-hidden="true">✓</span>
              <h3>{copy.auth.verifyTitle}</h3>
              <p>{verificationMessage}</p>
              <span className="auth-verify-hint">{copy.auth.verifyHint}</span>
              {resendMessage ? <span className="auth-verify-hint">{resendMessage}</span> : null}
              <div className="auth-verify-actions">
                <button
                  type="button"
                  className="auth-submit"
                  onClick={handleResend}
                  disabled={isResending || resendCooldown > 0}
                >
                  {isResending
                    ? copy.auth.loading
                    : resendCooldown > 0
                    ? copy.auth.verifyResendCooldown(resendCooldown)
                    : copy.auth.verifyResend}
                </button>
                <button type="button" className="auth-secondary" onClick={() => setMode("login")}>
                  {copy.auth.verifyBackLogin}
                </button>
              </div>
            </div>
          ) : (
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
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button type="submit" className="auth-submit" disabled={isSubmitting}>
                {isSubmitting ? copy.auth.loading : submitLabel}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
