"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { copy } from "../../../src/shared/lib/strings";

type VerifyState = "idle" | "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [state, setState] = useState<VerifyState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const hasRun = useRef(false);
  const redirectTimeout = useRef<number | null>(null);

  const resolveErrorMessage = useCallback((payload: any) => {
    switch (payload?.code) {
      case "token_not_found":
      case "invalid_token":
        return copy.auth.verifyErrorInvalid;
      case "token_used":
        return copy.auth.verifyErrorUsed;
      case "token_expired":
        return copy.auth.verifyErrorExpired;
      default:
        return payload?.error || copy.auth.verifyErrorText;
    }
  }, []);

  const runVerification = useCallback(async () => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;
    if (!token) {
      setState("error");
      setMessage(copy.auth.verifyErrorText);
      return;
    }
    setState("loading");
    try {
      const response = await fetch(
        `/api/auth/verify?token=${encodeURIComponent(token)}`
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setState("error");
        setMessage(resolveErrorMessage(payload));
        return;
      }
      setState("success");
      setMessage(payload?.message || copy.auth.verifySuccessText);
      redirectTimeout.current = window.setTimeout(() => {
        router.replace("/");
      }, 1400);
    } catch {
      setState("error");
      setMessage(copy.auth.verifyErrorText);
    }
  }, [resolveErrorMessage, router, token]);

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage(copy.auth.verifyErrorText);
      return;
    }
    runVerification();
    return () => {
      if (redirectTimeout.current !== null) {
        window.clearTimeout(redirectTimeout.current);
      }
    };
  }, [runVerification, token]);

  return (
    <div className="verify-page">
      <div className="verify-card">
        <h1>
          {state === "success"
            ? copy.auth.verifySuccessTitle
            : state === "error"
            ? copy.auth.verifyErrorTitle
            : state === "loading"
            ? copy.auth.verifyProcessingTitle
            : copy.auth.verifyLinkTitle}
        </h1>
        <p>
          {message ||
            (state === "loading"
              ? copy.auth.verifyProcessingText
              : state === "idle"
              ? copy.auth.verifyLinkText
              : copy.auth.verifyText)}
        </p>
        {state === "loading" ? (
          <div className="verify-loader" aria-hidden="true" />
        ) : null}
        <div className="verify-actions">
          {state === "error" ? (
            <button
              type="button"
              className="auth-secondary"
              onClick={() => {
                hasRun.current = false;
                runVerification();
              }}
            >
              {copy.auth.verifyRetry}
            </button>
          ) : null}
          <Link href="/" className="auth-secondary">
            {copy.auth.verifyBackHome}
          </Link>
          <Link href="/saved" className="auth-submit">
            {copy.auth.verifyBackLogin}
          </Link>
        </div>
      </div>
    </div>
  );
}
